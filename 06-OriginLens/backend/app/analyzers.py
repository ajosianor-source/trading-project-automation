from __future__ import annotations

import hashlib
import io
import importlib
import math
import os
import shutil
import subprocess
import tempfile
from typing import Any
from dataclasses import dataclass

from PIL import Image, ImageFilter, ImageOps

from .config import settings
from .schemas import AnalysisResult, MediaContext, PolicyAction, ProvenanceContext, SignalScore

np = importlib.import_module("numpy") if importlib.util.find_spec("numpy") else None
ort = importlib.import_module("onnxruntime") if importlib.util.find_spec("onnxruntime") else None


def _clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
    return max(minimum, min(maximum, value))


def _entropy(image: Image.Image) -> float:
    histogram = image.convert("L").histogram()
    pixels = sum(histogram)
    if pixels == 0:
        return 0.0

    entropy = 0.0
    for count in histogram:
        if count == 0:
            continue
        probability = count / pixels
        entropy -= probability * math.log2(probability)
    return entropy


def _difference_score(image: Image.Image) -> float:
    grayscale = ImageOps.grayscale(image.resize((96, 96)))
    pixels = list(grayscale.getdata())
    width, height = grayscale.size
    differences: list[int] = []
    for y in range(height):
        row_start = y * width
        for x in range(width - 1):
            differences.append(abs(pixels[row_start + x] - pixels[row_start + x + 1]))
    if not differences:
        return 0.0
    return sum(differences) / (len(differences) * 255)


def _edge_density(image: Image.Image) -> float:
    edges = image.convert("L").resize((96, 96)).filter(ImageFilter.FIND_EDGES)
    values = list(edges.getdata())
    if not values:
        return 0.0
    return sum(values) / (len(values) * 255)


def _color_variance(image: Image.Image) -> float:
    reduced = image.resize((96, 96))
    channels = reduced.split()
    variances = []
    for channel in channels:
        values = list(channel.getdata())
        if not values:
            continue
        mean = sum(values) / len(values)
        variance = sum((value - mean) ** 2 for value in values) / len(values)
        variances.append(variance / (255 ** 2))
    if not variances:
        return 0.0
    return sum(variances) / len(variances)


def _byte_entropy(contents: bytes, sample_size: int = 65536) -> float:
    sample = contents[:sample_size]
    if not sample:
        return 0.0
    counts = [0] * 256
    for value in sample:
        counts[value] += 1
    entropy = 0.0
    length = len(sample)
    for count in counts:
        if count == 0:
            continue
        probability = count / length
        entropy -= probability * math.log2(probability)
    return entropy / 8


def _select_policy(risk_band: str, requested_policy: PolicyAction | None) -> PolicyAction:
    if requested_policy == "block" and risk_band == "high":
        return "block"
    if risk_band == "high":
        return "blur_and_warn"
    if risk_band == "medium":
        return requested_policy or "warn"
    return "allow"


def _verdict_for_band(risk_band: str) -> str:
    if risk_band == "high":
        return "high_risk_synthetic"
    if risk_band == "medium":
        return "suspicious_media"
    return "low_risk_media"


def _risk_band(score: float) -> str:
    if score >= 0.67:
        return "high"
    if score >= 0.35:
        return "medium"
    return "low"


def _message_for_band(risk_band: str, provenance: ProvenanceContext, source_type: str) -> str:
    if risk_band == "high":
        return f"High-risk {source_type} pattern. Review before trusting or sharing."
    if risk_band == "medium":
        if provenance.has_c2pa or provenance.source_verified:
            return f"Mixed signals detected in this {source_type}. Provenance helps, but the media should still be reviewed."
        return f"Suspicious {source_type} pattern and weak provenance. Treat cautiously."
    return f"Low-risk result from the current {settings.engine_mode} engine. This is not a guarantee of authenticity."


@dataclass
class EngineFeatures:
    digest: str
    width: int | None = None
    height: int | None = None
    entropy: float | None = None
    edge_density: float | None = None
    difference_score: float | None = None
    color_variance: float | None = None
    byte_entropy: float | None = None
    sampled_frame_count: int | None = None


class OptionalModelAdapter:
    def __init__(self) -> None:
        self._session: Any | None = None
        self._session_attempted = False

    def _get_session(self) -> Any | None:
        if self._session_attempted:
            return self._session

        self._session_attempted = True
        if ort is None or np is None:
            return None

        model_path = settings.model_path
        if not model_path or not os.path.exists(model_path):
            return None

        try:
            self._session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        except Exception:
            self._session = None
        return self._session

    def _prepare_tensor(self, image: Image.Image) -> np.ndarray:
        if np is None:
            raise RuntimeError("numpy is not available")
        resized = image.resize((224, 224)).convert("RGB")
        array = np.asarray(resized, dtype=np.float32) / 255.0
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (array - mean) / std
        chw = np.transpose(normalized, (2, 0, 1))
        return np.expand_dims(chw, axis=0).astype(np.float32)

    def _softmax(self, values: np.ndarray) -> np.ndarray:
        if np is None:
            raise RuntimeError("numpy is not available")
        shifted = values - np.max(values)
        exponents = np.exp(shifted)
        return exponents / np.sum(exponents)

    def score_image_image(self, image: Image.Image) -> SignalScore | None:
        session = self._get_session()
        if session is None:
            return None

        try:
            input_name = session.get_inputs()[0].name
            outputs = session.run(None, {input_name: self._prepare_tensor(image)})
            logits = np.asarray(outputs[0]).reshape(-1)
            probabilities = self._softmax(logits)
            fake_probability = float(probabilities[-1])
        except Exception:
            return None

        return SignalScore(
            name="onnx_image_detector",
            score=round(_clamp(fake_probability), 4),
            detail="Compression-robust ONNX image detector score.",
        )

    def score_image(self, features: EngineFeatures) -> SignalScore | None:
        if settings.engine_mode not in {"hybrid-ready", "model"}:
            return None

        if features.edge_density is None or features.difference_score is None:
            return None

        synthetic_pressure = _clamp((features.edge_density * 0.45) + ((1 - features.difference_score) * 0.35) + ((1 - (features.color_variance or 0.0)) * 0.20))
        return SignalScore(
            name="learned_model_proxy",
            score=round(synthetic_pressure, 4),
            detail="Hybrid-ready proxy score from the model adapter slot. Replace this with a calibrated CNN, ViT, or ensemble inference provider.",
        )

    def score_video(self, features: EngineFeatures) -> SignalScore | None:
        if settings.engine_mode not in {"hybrid-ready", "model"}:
            return None

        if features.byte_entropy is None:
            return None

        streaming_pressure = _clamp((features.byte_entropy * 0.55) + 0.15)
        return SignalScore(
            name="temporal_model_proxy",
            score=round(streaming_pressure, 4),
            detail="Hybrid-ready proxy score for the async video analyzer slot. Replace this with sampled-frame temporal inference.",
        )


def _extract_video_frames(contents: bytes, sample_count: int) -> list[Image.Image]:
    ffmpeg_path = settings.ffmpeg_path or shutil.which("ffmpeg")
    if ffmpeg_path is None:
        return []

    sample_count = max(1, sample_count)
    with tempfile.TemporaryDirectory(prefix="originlens-video-") as temp_dir:
        input_path = os.path.join(temp_dir, "input-video.bin")
        output_pattern = os.path.join(temp_dir, "frame-%03d.jpg")
        with open(input_path, "wb") as file_handle:
            file_handle.write(contents)

        command = [
            ffmpeg_path,
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            input_path,
            "-vf",
            f"fps=1,scale=320:-1:flags=lanczos",
            "-frames:v",
            str(sample_count),
            output_pattern,
        ]

        try:
            subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except Exception:
            return []

        frames: list[Image.Image] = []
        for entry in sorted(os.listdir(temp_dir)):
            if not entry.lower().endswith(".jpg"):
                continue
            frame_path = os.path.join(temp_dir, entry)
            try:
                with Image.open(frame_path) as frame_image:
                    frames.append(frame_image.convert("RGB"))
            except Exception:
                continue
        return frames


def model_runtime_available() -> bool:
    return np is not None and ort is not None


def ffmpeg_available() -> bool:
    candidate = settings.ffmpeg_path or shutil.which("ffmpeg")
    return candidate is not None and os.path.exists(candidate)


class SignalFusionEngine:
    def __init__(self) -> None:
        self.model_adapter = OptionalModelAdapter()

    def _base_signals(self, context: MediaContext) -> list[SignalScore]:
        signals: list[SignalScore] = []
        if not context.provenance.has_c2pa:
            signals.append(
                SignalScore(
                    name="missing_provenance",
                    score=0.36,
                    detail="No trusted provenance claim was supplied with this media.",
                )
            )
        else:
            signals.append(
                SignalScore(
                    name="provenance_present",
                    score=0.08,
                    detail="Trusted provenance metadata was supplied.",
                )
            )

        if not context.provenance.source_verified:
            signals.append(
                SignalScore(
                    name="unverified_source",
                    score=0.24,
                    detail="The source has not been independently verified.",
                )
            )

        return signals

    def _build_result(
        self,
        *,
        context: MediaContext,
        signals: list[SignalScore],
        source_type: str,
        trace_detail: str,
    ) -> AnalysisResult:
        average_score = sum(signal.score for signal in signals) / max(len(signals), 1)
        confidence = _clamp(average_score + 0.05)
        risk_band = _risk_band(confidence)
        policy_action = _select_policy(risk_band, context.requested_policy or settings.default_policy)
        verdict = _verdict_for_band(risk_band)
        message = _message_for_band(risk_band, context.provenance, source_type)
        signals.append(
            SignalScore(
                name="trace_id",
                score=0.0,
                detail=trace_detail,
            )
        )
        return AnalysisResult(
            engine_mode=settings.engine_mode,
            verdict=verdict,
            risk_band=risk_band,
            confidence=round(confidence, 4),
            provenance=context.provenance,
            signals=signals,
            regions=[],
            policy_action=policy_action,
            message=message,
        )

    def analyze_image(self, contents: bytes, filename: str, content_type: str | None, context: MediaContext) -> AnalysisResult:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        width, height = image.size
        features = EngineFeatures(
            digest=hashlib.sha256(contents).hexdigest(),
            width=width,
            height=height,
            entropy=_entropy(image),
            edge_density=_edge_density(image),
            difference_score=_difference_score(image),
            color_variance=_color_variance(image),
        )

        signals = self._base_signals(context)

        if min(width, height) < 320:
            signals.append(
                SignalScore(
                    name="low_resolution_input",
                    score=0.21,
                    detail="Low-resolution media reduces trust and increases ambiguity.",
                )
            )

        if features.entropy is not None and features.entropy < 4.4:
            signals.append(
                SignalScore(
                    name="flat_texture_distribution",
                    score=0.18,
                    detail="Texture distribution is unusually flat for a natural image.",
                )
            )
        elif features.entropy is not None and features.entropy > 7.4:
            signals.append(
                SignalScore(
                    name="high_noise_distribution",
                    score=0.16,
                    detail="Noise distribution is unusually aggressive and may reflect repeated compression or synthesis.",
                )
            )

        if features.edge_density is not None and features.edge_density > 0.33:
            signals.append(
                SignalScore(
                    name="edge_artifact_pressure",
                    score=0.17,
                    detail="Edge density is elevated relative to the image texture pattern.",
                )
            )

        if features.difference_score is not None and features.difference_score < 0.11:
            signals.append(
                SignalScore(
                    name="spatial_smoothing_pattern",
                    score=0.14,
                    detail="Neighboring pixel transitions are unusually smooth and may reflect synthesis or aggressive denoising.",
                )
            )

        if features.color_variance is not None and features.color_variance < 0.03:
            signals.append(
                SignalScore(
                    name="compressed_color_distribution",
                    score=0.12,
                    detail="Color variance is narrow, which reduces certainty and often appears in web-degraded synthetic media.",
                )
            )

        if content_type == "image/webp":
            signals.append(
                SignalScore(
                    name="web_delivery_artifacts",
                    score=0.10,
                    detail="Web-optimized formats often mask forensic detail and reduce certainty.",
                )
            )

        learned_signal = self.model_adapter.score_image_image(image)
        if learned_signal is not None:
            signals.append(learned_signal)
        else:
            model_signal = self.model_adapter.score_image(features)
            if model_signal is not None:
                signals.append(model_signal)

        return self._build_result(
            context=context,
            signals=signals,
            source_type="image",
            trace_detail=f"sha256:{features.digest[:16]} file:{filename or 'unknown'} {width}x{height}",
        )

    def analyze_video(self, contents: bytes, filename: str, content_type: str | None, context: MediaContext) -> AnalysisResult:
        digest = hashlib.sha256(contents).hexdigest()
        size_mb = len(contents) / (1024 * 1024)
        frames = _extract_video_frames(contents, settings.video_sample_count)
        features = EngineFeatures(
            digest=digest,
            byte_entropy=_byte_entropy(contents),
            sampled_frame_count=len(frames),
        )

        signals = self._base_signals(context)

        if size_mb < 0.5:
            signals.append(
                SignalScore(
                    name="short_or_low_bitrate_video",
                    score=0.18,
                    detail="Very small video payloads often indicate aggressive recompression or low evidence density.",
                )
            )

        if features.byte_entropy is not None and features.byte_entropy > 0.94:
            signals.append(
                SignalScore(
                    name="container_noise_pressure",
                    score=0.15,
                    detail="Compressed container entropy is high, which often reduces forensic confidence and may indicate layered encoding.",
                )
            )

        if content_type in {"video/webm", "video/mp4"}:
            signals.append(
                SignalScore(
                    name="common_web_stream_container",
                    score=0.08,
                    detail="Common web stream containers are expected but limit low-level forensic visibility without frame extraction.",
                )
            )

        if not frames:
            signals.append(
                SignalScore(
                    name="frame_extraction_unavailable",
                    score=0.16,
                    detail="No sample frames were extracted. Install ffmpeg and use a decodable video format for frame-level analysis.",
                )
            )
        else:
            frame_scores: list[float] = []
            low_texture_frames = 0
            for frame in frames:
                frame_learned_signal = self.model_adapter.score_image_image(frame)
                if frame_learned_signal is not None:
                    frame_scores.append(frame_learned_signal.score)
                frame_entropy = _entropy(frame)
                if frame_entropy < 4.2:
                    low_texture_frames += 1

            if frame_scores:
                signals.append(
                    SignalScore(
                        name="sampled_frame_model_score",
                        score=round(sum(frame_scores) / len(frame_scores), 4),
                        detail=f"Average image-model score across {len(frame_scores)} sampled frames.",
                    )
                )
            else:
                model_signal = self.model_adapter.score_video(features)
                if model_signal is not None:
                    signals.append(model_signal)

            low_texture_ratio = low_texture_frames / max(len(frames), 1)
            if low_texture_ratio >= 0.5:
                signals.append(
                    SignalScore(
                        name="sampled_frame_texture_collapse",
                        score=round(_clamp(0.12 + (low_texture_ratio * 0.2)), 4),
                        detail=f"{low_texture_frames} of {len(frames)} sampled frames show unusually flat texture patterns.",
                    )
                )

        return self._build_result(
            context=context,
            signals=signals,
            source_type="video",
            trace_detail=f"sha256:{digest[:16]} file:{filename or 'unknown'} size_mb:{size_mb:.2f} sampled_frames:{len(frames)}",
        )


engine = SignalFusionEngine()


def analyze_image_bytes(contents: bytes, filename: str, content_type: str | None, context: MediaContext) -> AnalysisResult:
    return engine.analyze_image(contents, filename, content_type, context)


def analyze_video_bytes(contents: bytes, filename: str, content_type: str | None, context: MediaContext) -> AnalysisResult:
    return engine.analyze_video(contents, filename, content_type, context)

