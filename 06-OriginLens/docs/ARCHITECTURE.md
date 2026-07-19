# OriginLens Architecture

## Product position

OriginLens is designed as a practical trust layer for web media, not a magic true-or-false oracle. The browser extension captures user intent and media context, while the backend performs risk scoring and returns a policy decision with reasons.

## Request flow

1. A user scans a specific image or video, or requests a scan of visible media.
2. The extension fetches the media source and sends it to the backend with page context.
3. The backend performs provenance and quality checks and fuses the resulting signals.
4. The backend returns a calibrated risk band and policy action.
5. The extension shows a badge and can blur suspicious media.

## Why this design

- Heavy analysis belongs on the backend, where models and rules can be updated.
- The extension should stay responsive and avoid sustained CPU use.
- Provenance needs to sit beside model outputs rather than behind them.
- The user experience should explain why a result is suspicious.

## Current analyzer strategy

The shipped analyzer is a heuristic placeholder with a production-shaped interface. It deliberately exposes these slots so the backend can later grow into a full fusion engine:

- provenance verification
- spatial artifact model
- temporal inconsistency model
- identity-conditioned verification
- explanation generator
- decision calibrator

The current implementation now separates the fusion engine from the model adapter. In `heuristic` mode, the service returns risk output from provenance and media-quality features alone. In `hybrid-ready` mode, it also activates model-adapter proxy slots so a learned image or temporal model can be dropped in without changing the API contract. In `model` mode, the image path will load an ONNX detector from disk and contribute its score directly to the fused decision.

The runtime is capability-aware. If ONNX Runtime, NumPy, the model file, or `ffmpeg` are unavailable, the service keeps running and degrades to heuristic signals rather than failing at import time.

## Video analysis workflow

Video analysis is asynchronous.

1. The extension uploads a video to `POST /api/v1/analyze/video`.
2. The backend returns a job ID and a suggested polling interval.
3. The backend extracts sampled frames with `ffmpeg` and runs each sampled frame through the image-analysis path when a model is available.
4. The extension polls `GET /api/v1/jobs/{job_id}`.
5. The completed job returns a normal `AnalysisResult`, so image and video can share the same UI surface.

## Suggested next backend milestones

1. Add model registry and versioned analyzer selection.
2. Add async queue for video jobs.
3. Add trusted-origin and signed-request enforcement.
4. Add human feedback capture for false positive review.
5. Add observability for risk drift and latency.
