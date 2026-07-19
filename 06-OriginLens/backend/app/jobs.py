from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime

from .analyzers import analyze_video_bytes
from .schemas import MediaContext, VideoJobState


class VideoJobStore:
    def __init__(self) -> None:
        self._jobs: dict[str, VideoJobState] = {}
        self._lock = asyncio.Lock()

    async def create_job(self) -> VideoJobState:
        now = datetime.now(UTC).isoformat()
        job_id = str(uuid.uuid4())
        state = VideoJobState(
            status="queued",
            job_id=job_id,
            submitted_at=now,
            updated_at=now,
        )
        async with self._lock:
            self._jobs[job_id] = state
        return state

    async def update_job(self, job_id: str, **changes) -> VideoJobState | None:
        async with self._lock:
            state = self._jobs.get(job_id)
            if state is None:
                return None
            updated = state.model_copy(update={**changes, "updated_at": datetime.now(UTC).isoformat()})
            self._jobs[job_id] = updated
            return updated

    async def get_job(self, job_id: str) -> VideoJobState | None:
        async with self._lock:
            return self._jobs.get(job_id)


video_jobs = VideoJobStore()


async def process_video_job(
    *,
    job_id: str,
    contents: bytes,
    filename: str,
    content_type: str | None,
    context: MediaContext,
) -> None:
    await video_jobs.update_job(job_id, status="processing", error=None)
    await asyncio.sleep(0)
    try:
        result = analyze_video_bytes(contents, filename, content_type, context)
    except Exception as exc:
        await video_jobs.update_job(job_id, status="failed", error=str(exc), result=None)
        return

    await video_jobs.update_job(job_id, status="completed", result=result, error=None)
