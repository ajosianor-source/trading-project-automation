import time
from contextlib import asynccontextmanager
from uuid import uuid4

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.responses import Response

from app.config import get_settings
from app.routers import dicom, fhir, hl7, icu, iomt, orchestrator, sources
from app.services.container import ServiceContainer
from app.services.ingestion_orchestrator import IngestionOrchestrator
from app.services.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)
log = structlog.get_logger()
REQUESTS = Counter("ingestion_http_requests_total", "Requests", ["method", "path", "status"])
LATENCY = Histogram("ingestion_http_duration_seconds", "Latency", ["method", "path"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    services = ServiceContainer(settings)
    await services.start()
    app.state.container = services
    app.state.orchestrator = IngestionOrchestrator(services)
    log.info("service_started", environment=settings.environment)
    try:
        yield
    finally:
        await app.state.orchestrator.stop()
        await services.stop()
        log.info("service_stopped")


app = FastAPI(
    title="HealthGov Data Ingestion",
    version="1.0.0",
    description="Secure ingestion and normalization for healthcare data streams.",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", uuid4().hex)
    started = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        log.exception("unhandled_request_error", request_id=request_id, path=request.url.path)
        response = JSONResponse({"detail": "Internal server error"}, status_code=500)
    duration = time.monotonic() - started
    REQUESTS.labels(request.method, request.url.path, response.status_code).inc()
    LATENCY.labels(request.method, request.url.path).observe(duration)
    response.headers.update(
        {
            "X-Request-ID": request_id,
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Cache-Control": "no-store",
        }
    )
    log.info(
        "request_complete",
        request_id=request_id,
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=round(duration * 1000, 2),
    )
    return response


@app.get("/healthz", include_in_schema=False)
async def healthz():
    return {"status": "ok", "service": settings.service_name}


@app.get("/readyz", include_in_schema=False)
async def readyz(request: Request):
    container = getattr(request.app.state, "container", None)
    if container is None or not await container.ready():
        return JSONResponse({"status": "not-ready"}, status_code=503)
    return {"status": "ready", "service": settings.service_name}


@app.get("/metrics", include_in_schema=False)
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


app.include_router(fhir.router)
app.include_router(hl7.router)
app.include_router(dicom.router)
app.include_router(iomt.router)
app.include_router(icu.router)
app.include_router(orchestrator.router)
app.include_router(sources.router)
