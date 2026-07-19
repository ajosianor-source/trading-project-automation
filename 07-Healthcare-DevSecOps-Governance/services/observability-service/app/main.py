from enum import StrEnum
from typing import Annotated

from fastapi import Depends
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("observability-service")


class Sink(StrEnum):
    splunk = "splunk"
    wazuh = "wazuh"
    otlp = "otlp"


class Route(BaseModel):
    sink: Sink
    endpoint_reference: str = Field(pattern=r"^vault://[a-zA-Z0-9/_-]+$")
    event_types: list[str] = Field(min_length=1, max_length=100)
    minimum_severity: str = Field(pattern=r"^(debug|info|warning|error|critical)$")
    phi_redaction: bool = True


@app.post("/v1/telemetry/routes", status_code=201)
async def configure_route(
    body: Route,
    principal: Annotated[Principal, Depends(require_roles("security", "platform_admin"))],
):
    return {
        "tenant_id": principal.tenant_id,
        "status": "active",
        "sink": body.sink,
        "phi_redaction": True,
        "delivery": "at-least-once",
    }


@app.get("/v1/posture")
async def posture(
    principal: Annotated[
        Principal, Depends(require_roles("security", "executive", "platform_admin"))
    ],
):
    return {
        "tenant_id": principal.tenant_id,
        "metrics": "prometheus",
        "traces": "opentelemetry",
        "dashboards": "grafana",
        "siem": ["wazuh", "splunk"],
        "slo_status": "unknown",
    }
