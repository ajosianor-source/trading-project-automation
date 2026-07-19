from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text

from healthgov.frameworks import Control, score_controls, serialize_controls
from healthgov.multitenancy import tenant_session
from healthgov.security import Principal, require_roles


class Evidence(BaseModel):
    control_id: str = Field(max_length=80)
    status: Literal["effective", "partial", "ineffective", "not_applicable"]
    artifact_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    collector: str = Field(max_length=120)
    observed_at: datetime
    expires_at: datetime


def framework_router(framework: str, version: str, controls: tuple[Control, ...]) -> APIRouter:
    router = APIRouter(prefix="/v1")

    @router.get("/controls")
    async def list_controls(
        _: Annotated[
            Principal, Depends(require_roles("compliance", "auditor", "security", "executive"))
        ],
    ):
        return {
            "framework": framework,
            "version": version,
            "items": serialize_controls(controls),
            "total": len(controls),
        }

    @router.post("/evidence", status_code=202)
    async def evidence(
        body: Evidence,
        principal: Annotated[Principal, Depends(require_roles("service", "compliance", "auditor"))],
    ):
        known = {control.control_id for control in controls}
        accepted = body.control_id in known
        if accepted:
            async for session in tenant_session(principal.tenant_id):
                await session.execute(
                    text("""INSERT INTO compliance_events
                      (tenant_id,framework,control_id,event_type,source,status,artifact_sha256,
                       payload,observed_at)
                      VALUES (:tenant,:framework,:control,'evidence.observed',:collector,:status,
                              :artifact,CAST(:payload AS jsonb),:observed)"""),
                    {
                        "tenant": principal.tenant_id,
                        "framework": framework,
                        "control": body.control_id,
                        "collector": body.collector,
                        "status": body.status,
                        "artifact": body.artifact_sha256,
                        "payload": "{}",
                        "observed": body.observed_at,
                    },
                )
        return {
            "accepted": accepted,
            "tenant_id": principal.tenant_id,
            "framework": framework,
            "control_id": body.control_id,
            "fresh": body.expires_at > body.observed_at,
        }

    @router.post("/score")
    async def score(
        body: list[Evidence],
        _: Annotated[
            Principal, Depends(require_roles("compliance", "auditor", "security", "executive"))
        ],
    ):
        return {
            "framework": framework,
            "version": version,
            **score_controls(controls, [item.model_dump() for item in body]),
        }

    @router.get("/dashboard")
    async def dashboard(
        _: Annotated[
            Principal, Depends(require_roles("compliance", "auditor", "security", "executive"))
        ],
    ):
        domains: dict[str, int] = {}
        for control in controls:
            domains[control.domain] = domains.get(control.domain, 0) + 1
        async for session in tenant_session(_.tenant_id):
            rows = (
                await session.execute(
                    text("""SELECT DISTINCT ON (control_id) control_id,status,observed_at
                            FROM compliance_events WHERE framework=:framework
                            ORDER BY control_id,observed_at DESC"""),
                    {"framework": framework},
                )
            ).mappings()
            latest = [dict(row) for row in rows]
        calculated = score_controls(controls, latest)
        return {
            "framework": framework,
            "version": version,
            "score": calculated["score"],
            "control_count": len(controls),
            "domains": [{"name": key, "controls": value} for key, value in domains.items()],
            "evidence_freshness": round(100 * len(latest) / max(len(controls), 1), 1),
            "open_drift": 0,
            "status": "ready" if calculated["ready"] else "evidence_required",
        }

    return router
