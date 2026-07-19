from __future__ import annotations

import asyncio
import json
import os

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .analyzers import analyze_image_bytes, ffmpeg_available, model_runtime_available
from .config import settings
from .jobs import process_video_job, video_jobs
from .schemas import MediaContext, VideoJobAccepted

app = FastAPI(title="OriginLens Analysis Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, object]:
    return {
        "status": "ok",
        "engine_mode": settings.engine_mode,
        "model_runtime_available": model_runtime_available(),
        "model_path": settings.model_path,
        "model_file_present": bool(settings.model_path) and os.path.exists(settings.model_path),
        "ffmpeg_available": ffmpeg_available(),
        "video_sample_count": settings.video_sample_count,
    }


@app.post("/api/v1/analyze/image")
async def analyze_image(
    file: UploadFile = File(...),
    context_json: str | None = Form(default=None),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported by this endpoint.")

    try:
        context = MediaContext.model_validate_json(context_json) if context_json else MediaContext()
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid context JSON: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid context payload: {exc}") from exc

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    result = analyze_image_bytes(contents, file.filename or "upload", file.content_type, context)
    return result.model_dump()


@app.post("/api/v1/analyze/video")
async def analyze_video(
    file: UploadFile = File(...),
    context_json: str | None = Form(default=None),
):
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Only video uploads are supported by this endpoint.")

    try:
        context = MediaContext.model_validate_json(context_json) if context_json else MediaContext(source_type="video")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid context JSON: {exc}") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid context payload: {exc}") from exc

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    state = await video_jobs.create_job()
    asyncio.create_task(
        process_video_job(
            job_id=state.job_id,
            contents=contents,
            filename=file.filename or "upload",
            content_type=file.content_type,
            context=context,
        )
    )
    accepted = VideoJobAccepted(
        job_id=state.job_id,
        poll_after_seconds=settings.video_job_poll_seconds,
        message="Video accepted for asynchronous analysis.",
    )
    return accepted.model_dump()


@app.get("/api/v1/jobs/{job_id}")
async def get_video_job(job_id: str):
    state = await video_jobs.get_job(job_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Video analysis job not found.")
    return state.model_dump()
