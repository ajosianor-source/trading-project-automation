import time
from contextlib import asynccontextmanager
from uuid import uuid4

import structlog
from config import get_settings
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from routers import dicom, fhir, hl7, icu, iomt
from starlette.responses import Response

from database import database_ready, engine
from services import Normalizer, StoreService
from services.consumer import ClinicalConsumer
from services.normalize import NormalizationError

settings = get_settings()
structlog.configure(
    wrapper_class=structlog.make_filtering_bound_logger(settings.log_level),
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
)
log = structlog.get_logger()
REQUESTS = Counter("data_store_http_requests_total", "HTTP requests", ["method", "path", "status"])
LATENCY = Histogram("data_store_http_duration_seconds", "HTTP latency", ["method", "path"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema creation is intentionally excluded. Migrations must run as a release command.
    app.state.normalizer = Normalizer(
        settings.tokenization_secret, settings.phi_encryption_key, settings.phi_key_version
    )
    app.state.store = StoreService()
    app.state.consumer = ClinicalConsumer(settings, app.state.normalizer, app.state.store)
    if settings.kafka_enabled:
        await app.state.consumer.start()
    log.info("service_started", service=settings.service_name, environment=settings.environment)
    try:
        yield
    finally:
        if settings.kafka_enabled:
            await app.state.consumer.stop()
        await engine.dispose()
        log.info("service_stopped", service=settings.service_name)


app = FastAPI(
    title="HealthGov Clinical Data Store",
    version="1.0.0",
    description="Tenant-isolated normalized healthcare persistence and dashboard projections.",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)


@app.exception_handler(NormalizationError)
async def normalization_error(_: Request, exc: NormalizationError):
    return JSONResponse({"detail": str(exc)}, status_code=422)


@app.middleware("http")
async def secure_request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", uuid4().hex)
    started = time.monotonic()
    structlog.contextvars.bind_contextvars(request_id=request_id)
    try:
        response = await call_next(request)
    except Exception:
        # Never log request bodies: they can contain PHI.
        log.exception("unhandled_request_error", path=request.url.path)
        response = JSONResponse({"detail": "Internal server error"}, status_code=500)
    duration = time.monotonic() - started
    REQUESTS.labels(request.method, request.url.path, response.status_code).inc()
    LATENCY.labels(request.method, request.url.path).observe(duration)
    response.headers.update(
        {
            "X-Request-ID": request_id,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
        }
    )
    log.info(
        "request_complete",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=round(duration * 1000, 2),
    )
    structlog.contextvars.clear_contextvars()
    return response


@app.get("/healthz", include_in_schema=False)
async def healthz():
    return {"status": "ok", "service": settings.service_name}


@app.get("/readyz", include_in_schema=False)
async def readyz():
    ready = await database_ready()
    return JSONResponse(
        {"status": "ready" if ready else "unavailable"}, status_code=200 if ready else 503
    )


@app.get("/metrics", include_in_schema=False)
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


for source_router in (fhir.router, hl7.router, dicom.router, iomt.router, icu.router):
    app.include_router(source_router)
