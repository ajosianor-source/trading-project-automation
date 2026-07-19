import json
from datetime import UTC, datetime
from typing import Annotated, Any, Literal

from fastapi import Depends
from healthgov.frameworks import STATUS_WEIGHT
from healthgov.middleware import secure_app
from healthgov.multitenancy import tenant_session
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field
from sqlalchemy import text

app = secure_app("compliance-event-service")


class ComplianceEvent(BaseModel):
    framework: Literal["HIPAA", "GDPR", "NHS_DSPT", "ISO27001", "SOC2"]
    control_id: str = Field(pattern=r"^[A-Za-z0-9._-]{1,80}$")
    event_type: str = Field(pattern=r"^[a-z0-9._-]{1,80}$")
    source: str = Field(min_length=1, max_length=120)
    status: Literal["effective", "partial", "ineffective", "not_applicable"]
    artifact_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    observed_at: datetime
    attributes: dict[str, Any] = Field(default_factory=dict)


@app.post("/v1/events", status_code=202)
async def ingest(
    event: ComplianceEvent,
    principal: Annotated[Principal, Depends(require_roles("service", "compliance", "auditor"))],
):
    async for session in tenant_session(principal.tenant_id):
        event_id = await session.scalar(
            text("""INSERT INTO compliance_events
              (tenant_id,framework,control_id,event_type,source,status,artifact_sha256,payload,observed_at)
              VALUES (:tenant,:framework,:control,:type,:source,:status,:artifact,
                      :payload,:observed)
              RETURNING event_id"""),
            {
                "tenant": principal.tenant_id,
                "framework": event.framework,
                "control": event.control_id,
                "type": event.event_type,
                "source": event.source,
                "status": event.status,
                "artifact": event.artifact_sha256,
                "payload": json.dumps(event.attributes, separators=(",", ":")),
                "observed": event.observed_at,
            },
        )
    return {"accepted": True, "event_id": event_id}


@app.get("/v1/events")
async def events(
    principal: Annotated[
        Principal, Depends(require_roles("compliance", "auditor", "security", "executive"))
    ],
    framework: str = "",
    limit: int = 100,
):
    bounded = min(max(limit, 1), 500)
    async for session in tenant_session(principal.tenant_id):
        rows = (
            await session.execute(
                text("""SELECT event_id,framework,control_id,event_type,source,status,
                               artifact_sha256,observed_at,ingested_at
                        FROM compliance_events
                        WHERE (:framework='' OR framework=:framework)
                        ORDER BY observed_at DESC LIMIT :limit"""),
                {"framework": framework, "limit": bounded},
            )
        ).mappings()
        items = [dict(row) for row in rows]
    return {"items": items, "total": len(items)}


class MappingRequest(BaseModel):
    source_controls: list[str] = Field(max_length=1000)


@app.post("/v1/controls/map")
async def map_controls(
    body: MappingRequest,
    _: Annotated[Principal, Depends(require_roles("compliance", "auditor"))],
):
    mappings = {
        control: {
            "NHS_DSPT": ["A1.a", "B1.a"] if "access" in control.lower() else ["C1.a"],
            "ISO27001": ["A.5.15", "A.5.16"] if "access" in control.lower() else ["A.5.1"],
            "SOC2": ["CC6.1", "CC6.2"] if "access" in control.lower() else ["CC1.1"],
        }
        for control in body.source_controls
    }
    return {"mappings": mappings, "review_required": True}


class DriftRequest(BaseModel):
    framework: str
    expected: dict[str, str]
    actual: dict[str, str]


@app.post("/v1/drift")
async def drift(
    body: DriftRequest,
    _: Annotated[Principal, Depends(require_roles("compliance", "security"))],
):
    changes = [
        {"control_id": key, "expected": body.expected.get(key), "actual": body.actual.get(key)}
        for key in sorted(set(body.expected) | set(body.actual))
        if body.expected.get(key) != body.actual.get(key)
    ]
    return {"drifted": bool(changes), "changes": changes, "detected_at": datetime.now(UTC)}


@app.post("/v1/score")
async def score(
    events: list[ComplianceEvent],
    _: Annotated[Principal, Depends(require_roles("compliance", "auditor", "executive"))],
):
    value = sum(STATUS_WEIGHT[event.status] for event in events) / max(len(events), 1)
    return {"score": round(value * 100, 1), "observations": len(events)}
