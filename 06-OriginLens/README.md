# OriginLens

OriginLens is a browser-based deepfake risk detection product scaffold built for real-world deployment. It combines a Manifest V3 browser extension with a FastAPI analysis service that scores media using provenance-aware signal fusion and returns a policy action such as `allow`, `warn`, or `blur_and_warn`.

This project is intentionally structured around enterprise constraints:

- browser UX stays lightweight
- backend owns heavy analysis and policy calibration
- provenance is treated as a first-class signal
- outputs are risk bands with reasons, not absolute truth claims

## Project layout

- `extension/`: Chrome or Edge extension for scan triggers, overlays, and policy actions
- `backend/`: FastAPI service for media analysis and signal fusion
- `docs/`: architecture and product notes
- `shared/`: example contracts shared between the extension and backend

## MVP capabilities

- right-click scan for images and videos
- popup-based configuration for backend URL, policy, and auto-scan mode
- visible-media scanning from the popup
- browser-side overlays with risk band, action, and reasons
- backend risk fusion using provenance, quality signals, and a model-adapter slot
- async video submission and polling workflow

## Current engine mode

The backend ships in `heuristic` mode by default so the project can run without proprietary model weights. Set `ORIGINLENS_ENGINE_MODE=hybrid-ready` to enable the model-adapter slots and exercise the production-shaped fusion path before you drop in a real CNN, ViT, or ensemble inference provider.

Set `ORIGINLENS_ENGINE_MODE=model` and place an ONNX classifier at `backend/models/originlens-image-detector.onnx` to activate the real image-model path. The service expects a binary classifier where the last logit corresponds to the synthetic or fake class.

Real ONNX inference is currently a Python `3.11` to `3.13` path. This machine is on Python `3.14`, so the backend will keep running but the ONNX model path will remain disabled unless compatible wheels or nightly builds are installed.

## Run locally

### Backend

```powershell
Set-Location "c:\Users\nexfe\Desktop\Trading\06-OriginLens\backend"
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Install `ffmpeg` on the host machine if you want video jobs to analyze sampled frames instead of falling back to container-level signals only.

If `ffmpeg` is installed outside your active `PATH`, set `ORIGINLENS_FFMPEG_PATH` to the full `ffmpeg.exe` location.

### Extension

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable Developer Mode.
3. Click `Load unpacked`.
4. Select `c:\Users\nexfe\Desktop\Trading\06-OriginLens\extension`.

## API surface

- `POST /api/v1/analyze/image`: synchronous image analysis
- `POST /api/v1/analyze/video`: asynchronous video job creation
- `GET /api/v1/jobs/{job_id}`: video job status polling
- `GET /health`: service health probe

## Model and video runtime notes

- Image model path: `backend/models/originlens-image-detector.onnx`
- Expected ONNX input: `1x3x224x224` normalized RGB tensor
- Expected ONNX output: logits or probabilities with the final class representing synthetic media
- Video frame extraction: uses system `ffmpeg` to sample still frames during async video analysis
- `ORIGINLENS_FFMPEG_PATH` can point directly to `ffmpeg.exe` when PATH discovery is unreliable
- Health endpoint reports whether ONNX runtime and `ffmpeg` are actually available on the host

## Production upgrades

1. Replace the model-adapter proxy with compression-robust image and video models.
2. Add signed extension-to-backend authentication.
3. Add provenance verification with C2PA-aware parsing.
4. Replace polling with WebSocket streaming for long-running video jobs.
5. Calibrate risk thresholds on held-out, platform-degraded validation sets.
