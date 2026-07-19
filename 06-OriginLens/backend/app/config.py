from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    allowed_origins: list[str]
    engine_mode: str
    default_policy: str
    video_job_poll_seconds: float
    model_path: str
    video_sample_count: int
    ffmpeg_path: str


def _split_origins(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def load_settings() -> Settings:
    origins = os.getenv("ORIGINLENS_ALLOWED_ORIGINS", "http://127.0.0.1")
    engine_mode = os.getenv("ORIGINLENS_ENGINE_MODE", "heuristic")
    default_policy = os.getenv("ORIGINLENS_DEFAULT_POLICY", "warn")
    video_job_poll_seconds = float(os.getenv("ORIGINLENS_VIDEO_JOB_POLL_SECONDS", "1.5"))
    model_path = os.getenv("ORIGINLENS_MODEL_PATH", "models/originlens-image-detector.onnx")
    video_sample_count = int(os.getenv("ORIGINLENS_VIDEO_SAMPLE_COUNT", "5"))
    ffmpeg_path = os.getenv("ORIGINLENS_FFMPEG_PATH", "")
    return Settings(
        allowed_origins=_split_origins(origins),
        engine_mode=engine_mode,
        default_policy=default_policy,
        video_job_poll_seconds=video_job_poll_seconds,
        model_path=model_path,
        video_sample_count=video_sample_count,
        ffmpeg_path=ffmpeg_path,
    )


settings = load_settings()
