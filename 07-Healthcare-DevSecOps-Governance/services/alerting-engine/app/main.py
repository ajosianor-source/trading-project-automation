import hashlib
import json
from datetime import UTC, datetime
from enum import StrEnum
from typing import Annotated, Any

from fastapi import Depends
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("alerting-engine")


class Severity(StrEnum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class Alert(BaseModel):
    source: str = Field(max_length=80)
    rule_id: str = Field(max_length=120)
    severity: Severity
    title: str = Field(max_length=200)
    summary: str = Field(max_length=2000)
    asset_token: str | None = Field(default=None, max_length=256)
    evidence_refs: list[str] = Field(default_factory=list, max_length=50)
    labels: dict[str, str] = Field(default_factory=dict)


class EscalationPolicy(BaseModel):
    policy_id: str
    notify: list[str] = Field(min_length=1)
    ticket_provider: str | None = Field(default=None, pattern=r"^(jira|servicenow)$")
    forensic_capture: bool = True
    playbook: str


@app.post("/v1/alerts", status_code=202)
async def create_alert(
    body: Alert,
    principal: Annotated[
        Principal, Depends(require_roles("service", "security", "incident_manager"))
    ],
):
    canonical = json.dumps(body.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    alert_id = hashlib.sha256(
        f"{principal.tenant_id}:{body.rule_id}:{canonical}".encode()
    ).hexdigest()[:24]
    return {
        "alert_id": alert_id,
        "status": "queued",
        "deduplication_key": f"{principal.tenant_id}:{body.rule_id}:{body.asset_token or 'global'}",
        "accepted_at": datetime.now(UTC).isoformat(),
    }


@app.get("/v1/alerts")
async def list_alerts(
    principal: Annotated[
        Principal, Depends(require_roles("security", "incident_manager", "auditor", "executive"))
    ],
    status: str = "open",
):
    return {"tenant_id": principal.tenant_id, "status": status, "items": [], "total": 0}


@app.post("/v1/alerts/{alert_id}/escalate", status_code=202)
async def escalate(
    alert_id: str,
    policy: EscalationPolicy,
    principal: Annotated[
        Principal, Depends(require_roles("security", "incident_manager", "tenant_admin"))
    ],
):
    # Workers resolve channel credentials from Vault; API payloads never carry provider secrets.
    return {
        "alert_id": alert_id,
        "tenant_id": principal.tenant_id,
        "workflow": "queued",
        "notifications": policy.notify,
        "ticket": policy.ticket_provider,
        "forensics": "requested" if policy.forensic_capture else "not_requested",
        "playbook": policy.playbook,
    }


@app.post("/v1/providers/test")
async def test_provider(
    configuration: dict[str, Any],
    _: Annotated[Principal, Depends(require_roles("tenant_admin", "incident_manager"))],
):
    allowed = {"email", "sms", "slack", "jira", "servicenow"}
    provider = str(configuration.get("provider", ""))
    return {"valid": provider in allowed, "provider": provider, "secret_reference_required": True}
