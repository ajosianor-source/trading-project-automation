import hashlib
import hmac
import json
from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import Depends, HTTPException
from healthgov.config import get_settings
from healthgov.middleware import secure_app
from healthgov.multitenancy import tenant_session
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field
from sqlalchemy import text

app = secure_app("audit-service")


class AuditEvent(BaseModel):
    action: Literal["read", "create", "update", "delete", "export", "tokenize", "decrypt"]
    resource_type: str = Field(min_length=1, max_length=80)
    resource_id: str = Field(min_length=1, max_length=256)
    patient_id_token: str | None = None
    purpose_of_use: str = Field(min_length=1, max_length=80)
    outcome: Literal["success", "denied", "error"]
    event_domain: Literal["phi", "fhir", "hl7", "dicom", "iomt", "ai_inference", "platform"] = (
        "platform"
    )
    trace_id: str = Field(min_length=16, max_length=64)
    previous_digest: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    retention_class: Literal["standard_7y", "legal_hold", "clinical_25y"] = "standard_7y"


@app.get("/v1/events")
async def list_events(
    principal: Annotated[
        Principal, Depends(require_roles("security", "privacy_officer", "auditor"))
    ],
    domain: str = "",
    limit: int = 100,
):
    bounded = min(max(limit, 1), 500)
    query = """SELECT occurred_at, actor_token, event_domain, action, resource_token,
                      purpose_of_use, outcome, trace_id, previous_digest, event_digest,
                      retention_class
               FROM audit_log
               WHERE (:domain = '' OR event_domain = :domain)
               ORDER BY occurred_at DESC LIMIT :limit"""
    async for session in tenant_session(principal.tenant_id):
        rows = (await session.execute(text(query), {"domain": domain, "limit": bounded})).mappings()
        items = [dict(row) for row in rows]
        total = await session.scalar(
            text("SELECT count(*) FROM audit_log WHERE (:domain = '' OR event_domain=:domain)"),
            {"domain": domain},
        )
    return {"tenant_id": principal.tenant_id, "domain": domain, "items": items,
            "total": total, "limit": bounded, "integrity": "tamper_evident"}


@app.post("/v1/events", status_code=202)
async def record_event(
    event: AuditEvent,
    principal: Annotated[
        Principal, Depends(require_roles("service", "security", "privacy_officer"))
    ],
):
    # Serialize each tenant's append operation so two concurrent events cannot fork the chain.
    occurred_at = datetime.now(UTC)
    timestamp = occurred_at.isoformat()
    canonical = json.dumps(event.model_dump(), sort_keys=True, separators=(",", ":"))
    key = (get_settings().tokenization_key or "development-audit-key").encode()
    actor_token = hmac.new(key, principal.subject.encode(), hashlib.sha256).hexdigest()
    resource_token = hmac.new(key, event.resource_id.encode(), hashlib.sha256).hexdigest()
    async for session in tenant_session(principal.tenant_id):
        await session.execute(
            text("SELECT pg_advisory_xact_lock(hashtext(:tenant))"),
            {"tenant": principal.tenant_id},
        )
        previous = await session.scalar(
            text("SELECT event_digest FROM audit_log ORDER BY audit_id DESC LIMIT 1")
        )
        if event.previous_digest and event.previous_digest != previous:
            raise HTTPException(status_code=409, detail="Audit chain head changed")
        digest = hashlib.sha256(
            f"{previous or 'GENESIS'}:{timestamp}:{actor_token}:{canonical}".encode()
        ).hexdigest()
        await session.execute(
            text("""INSERT INTO audit_log
                (tenant_id, occurred_at, actor_token, event_domain, action, resource_token,
                 purpose_of_use, outcome, trace_id, previous_digest, event_digest, retention_class)
                VALUES (:tenant, :occurred, :actor, :domain, :action, :resource, :purpose,
                        :outcome, :trace, :previous, :digest, :retention)"""),
            {"tenant": principal.tenant_id, "occurred": occurred_at, "actor": actor_token,
             "domain": event.event_domain, "action": event.action, "resource": resource_token,
             "purpose": event.purpose_of_use, "outcome": event.outcome, "trace": event.trace_id,
             "previous": previous, "digest": digest, "retention": event.retention_class},
        )
    return {
        "accepted": True,
        "event_digest": digest,
        "previous_digest": previous,
        "occurred_at": timestamp,
        "immutable_sink": "object-lock",
        "retention_class": event.retention_class,
    }
