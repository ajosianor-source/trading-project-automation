import os
import re
import time
import uuid

import structlog
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from healthgov.service_policies import ServiceMeshSecurity

log = structlog.get_logger()
REQUESTS = Counter("http_requests_total", "HTTP requests", ["service", "method", "status"])
LATENCY = Histogram("http_request_duration_seconds", "Request latency", ["service", "path"])
REQUEST_ID = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")
BLOCKED_METHODS = {"CONNECT", "TRACE", "TRACK"}


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, service_name: str):
        super().__init__(app)
        self.service_name = service_name
        self.mesh_security = ServiceMeshSecurity(os.getenv("MESH_SECRET", "default-mesh-secret-key-32-bytes-long"))

    async def dispatch(self, request: Request, call_next):
        supplied_request_id = request.headers.get("X-Request-ID", "")
        request_id = (
            supplied_request_id
            if REQUEST_ID.fullmatch(supplied_request_id)
            else str(uuid.uuid4())
        )
        started = time.monotonic()

        # Enforce Service Mesh mTLS simulation if enabled
        if os.getenv("ENFORCE_SERVICE_MESH", "false").lower() == "true":
            # Exclude healthz and metrics endpoints from service mesh checks
            if request.url.path not in ("/healthz", "/metrics", "/openapi.json"):
                service_token = request.headers.get("X-Service-Identity")
                if not service_token:
                    return JSONResponse(
                        {"detail": "mTLS simulation failed: Missing X-Service-Identity header"},
                        status_code=401
                    )
                try:
                    source_service = self.mesh_security.verify_service_token(service_token)
                    if not self.mesh_security.authorize_communication(source_service, self.service_name):
                        log.warning(
                            "service_mesh_blocked",
                            source=source_service,
                            target=self.service_name,
                            request_id=request_id
                        )
                        return JSONResponse(
                            {"detail": f"Service Mesh Policy: Communication from '{source_service}' to '{self.service_name}' is BLOCKED"},
                            status_code=403
                        )
                except Exception as exc:
                    return JSONResponse(
                        {"detail": f"mTLS simulation failed: {str(exc)}"},
                        status_code=401
                    )

        if request.method.upper() in BLOCKED_METHODS:
            response = JSONResponse({"detail": "Method not allowed"}, status_code=405)
        else:
            try:
                response = await call_next(request)
            except Exception:
                log.exception("request_failed", request_id=request_id, path=request.url.path)
                response = JSONResponse({"detail": "Internal server error"}, status_code=500)
        response.headers.update(
            {
                "X-Request-ID": request_id,
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY",
                "Referrer-Policy": "no-referrer",
                "Cache-Control": "no-store",
                "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
                "Permissions-Policy": "camera=(), microphone=(), geolocation=(), usb=()",
                "Cross-Origin-Resource-Policy": "same-site",
            }
        )
        if os.getenv("ENVIRONMENT", "development").lower() == "production":
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )
        REQUESTS.labels(self.service_name, request.method, response.status_code).inc()
        LATENCY.labels(self.service_name, request.url.path).observe(time.monotonic() - started)
        log.info(
            "request_complete",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status=response.status_code,
        )
        return response


def secure_app(name: str) -> FastAPI:
    app = FastAPI(title=name, docs_url=None, redoc_url=None, openapi_url="/openapi.json")
    app.add_middleware(SecurityMiddleware, service_name=name)

    @app.get("/healthz", include_in_schema=False)
    async def healthz():
        return {"status": "ok", "service": name}

    @app.get("/metrics", include_in_schema=False)
    async def metrics():
        return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

    return app
