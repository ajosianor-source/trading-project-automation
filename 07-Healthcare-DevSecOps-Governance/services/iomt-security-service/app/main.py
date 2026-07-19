import hashlib
import json
from datetime import datetime
from typing import Annotated, Literal

from fastapi import Depends, HTTPException
from healthgov.middleware import secure_app
from healthgov.multitenancy import tenant_session
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field
from sqlalchemy import text

app = secure_app("iomt-security-service")

PROFILES = {
    "heart_monitor": {
        "required_metrics": ["heart_rate", "lead_status"],
        "ranges": {"heart_rate": (20, 250), "temperature_c": (0, 60)},
        "criticality": 5,
    },
    "ventilator": {
        "required_metrics": ["respiratory_rate", "tidal_volume_ml", "oxygen_percent"],
        "ranges": {"respiratory_rate": (0, 80), "oxygen_percent": (21, 100)},
        "criticality": 5,
    },
    "wearable": {
        "required_metrics": ["heart_rate", "battery_percent"],
        "ranges": {"heart_rate": (20, 250), "battery_percent": (0, 100)},
        "criticality": 3,
    },
    "imaging": {
        "required_metrics": ["system_temperature_c", "queue_depth"],
        "ranges": {"system_temperature_c": (0, 80), "queue_depth": (0, 10000)},
        "criticality": 4,
    },
}
DeviceType = Literal["heart_monitor", "ventilator", "wearable", "imaging"]


class DeviceRegistration(BaseModel):
    device_id: str = Field(pattern=r"^[A-Za-z0-9:_-]{8,128}$")
    device_type: DeviceType
    manufacturer: str = Field(min_length=1, max_length=120)
    model: str = Field(min_length=1, max_length=120)
    site: str = Field(min_length=1, max_length=120)
    identity_thumbprint: str = Field(pattern=r"^[a-fA-F0-9]{64}$")
    firmware_version: str = Field(min_length=1, max_length=80)


@app.get("/v1/device-profiles")
async def profiles(
    _: Annotated[Principal, Depends(require_roles("security", "device_provisioner", "auditor"))],
):
    return {"items": [{"device_type": key, **value} for key, value in PROFILES.items()]}


@app.post("/v1/devices", status_code=201)
async def register(
    body: DeviceRegistration,
    principal: Annotated[Principal, Depends(require_roles("device_provisioner", "security"))],
):
    async for session in tenant_session(principal.tenant_id):
        await session.execute(
            text("""INSERT INTO iomt_devices
              (tenant_id,device_id,device_type,manufacturer,model,site,identity_thumbprint,
               firmware_version,trust_state,risk_score)
              VALUES (:tenant,:device,:type,:manufacturer,:model,:site,:thumbprint,:firmware,
                      'review',50)
              ON CONFLICT (tenant_id,device_id) DO UPDATE SET
                site=EXCLUDED.site, firmware_version=EXCLUDED.firmware_version"""),
            {
                "tenant": principal.tenant_id,
                "device": body.device_id,
                "type": body.device_type,
                "manufacturer": body.manufacturer,
                "model": body.model,
                "site": body.site,
                "thumbprint": body.identity_thumbprint.lower(),
                "firmware": body.firmware_version,
            },
        )
    return {"registered": True, "device_id": body.device_id, "trust_state": "review"}


@app.get("/v1/devices")
async def devices(
    principal: Annotated[
        Principal, Depends(require_roles("security", "device_provisioner", "auditor", "executive"))
    ],
    status: str = "",
    limit: int = 200,
):
    async for session in tenant_session(principal.tenant_id):
        rows = (
            await session.execute(
                text("""SELECT device_id,device_type,manufacturer,model,site,firmware_version,
                               trust_state,risk_score,last_seen_at,enrolled_at
                        FROM iomt_devices WHERE (:status='' OR trust_state=:status)
                        ORDER BY risk_score DESC LIMIT :limit"""),
                {"status": status, "limit": min(max(limit, 1), 500)},
            )
        ).mappings()
        items = [dict(row) for row in rows]
    return {"items": items, "total": len(items)}


class FirmwareScan(BaseModel):
    device_id: str
    version: str
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    signature_verified: bool
    sbom_sha256: str | None = Field(default=None, pattern=r"^[a-f0-9]{64}$")
    critical_findings: int = Field(default=0, ge=0)
    high_findings: int = Field(default=0, ge=0)


@app.post("/v1/firmware/scans", status_code=202)
async def firmware(
    body: FirmwareScan,
    principal: Annotated[Principal, Depends(require_roles("firmware_scanner", "security"))],
):
    failed = not body.signature_verified or body.critical_findings > 0
    status = "quarantined" if failed else "failed" if body.high_findings else "passed"
    risk = min(
        100,
        10
        + body.critical_findings * 35
        + body.high_findings * 12
        + (40 if not body.signature_verified else 0),
    )
    async for session in tenant_session(principal.tenant_id):
        await session.execute(
            text("""INSERT INTO iomt_firmware
              (tenant_id,device_id,version,sha256,signature_verified,sbom_sha256,
               critical_findings,high_findings,scan_status)
              VALUES (:tenant,:device,:version,:sha,:signed,:sbom,:critical,:high,:status)
              ON CONFLICT (tenant_id,device_id,sha256) DO UPDATE SET
                critical_findings=EXCLUDED.critical_findings,
                high_findings=EXCLUDED.high_findings,scan_status=EXCLUDED.scan_status"""),
            {
                "tenant": principal.tenant_id,
                "device": body.device_id,
                "version": body.version,
                "sha": body.sha256,
                "signed": body.signature_verified,
                "sbom": body.sbom_sha256,
                "critical": body.critical_findings,
                "high": body.high_findings,
                "status": status,
            },
        )
        await session.execute(
            text("""UPDATE iomt_devices SET risk_score=:risk,
                    trust_state=CASE WHEN :failed THEN 'quarantined' ELSE 'trusted' END
                    WHERE device_id=:device"""),
            {"risk": risk, "failed": failed, "device": body.device_id},
        )
    return {"accepted": True, "scan_status": status, "risk_score": risk}


class Telemetry(BaseModel):
    device_id: str
    device_type: DeviceType
    sequence: int = Field(ge=0)
    observed_at: datetime
    metrics: dict[str, float | int | str | None]


def normalize_and_detect(body: Telemetry) -> tuple[dict, float, list[str]]:
    profile = PROFILES[body.device_type]
    normalized = {key.lower().replace(" ", "_"): value for key, value in body.metrics.items()}
    reasons = [f"missing:{key}" for key in profile["required_metrics"] if key not in normalized]
    for key, limits in profile["ranges"].items():
        value = normalized.get(key)
        if isinstance(value, int | float) and not limits[0] <= value <= limits[1]:
            reasons.append(f"range:{key}")
    score = min(1.0, len(reasons) * 0.25 + (0.2 if profile["criticality"] == 5 and reasons else 0))
    return normalized, score, reasons


@app.post("/v1/telemetry", status_code=202)
async def telemetry(
    body: Telemetry,
    principal: Annotated[Principal, Depends(require_roles("medical_device", "service"))],
):
    normalized, anomaly_score, reasons = normalize_and_detect(body)
    canonical = json.dumps(normalized, sort_keys=True, separators=(",", ":"))
    integrity = hashlib.sha256(
        f"{principal.tenant_id}:{body.device_id}:{body.sequence}:{canonical}".encode()
    ).hexdigest()
    async for session in tenant_session(principal.tenant_id):
        device_type = await session.scalar(
            text("SELECT device_type FROM iomt_devices WHERE device_id=:device"),
            {"device": body.device_id},
        )
        if not device_type:
            raise HTTPException(status_code=404, detail="Device is not enrolled")
        if device_type != body.device_type:
            raise HTTPException(status_code=409, detail="Device profile mismatch")
        await session.execute(
            text("""INSERT INTO iomt_telemetry
              (tenant_id,device_id,sequence,observed_at,normalized_metrics,anomaly_score,
               anomaly_reasons,integrity_sha256)
              VALUES (:tenant,:device,:sequence,:observed,CAST(:metrics AS jsonb),:score,
                      CAST(:reasons AS jsonb),:integrity)
              ON CONFLICT (tenant_id,device_id,sequence) DO NOTHING"""),
            {
                "tenant": principal.tenant_id,
                "device": body.device_id,
                "sequence": body.sequence,
                "observed": body.observed_at,
                "metrics": canonical,
                "score": anomaly_score,
                "reasons": json.dumps(reasons),
                "integrity": integrity,
            },
        )
        await session.execute(
            text("""UPDATE iomt_devices SET last_seen_at=:observed,
                    risk_score=GREATEST(risk_score,:risk),
                    trust_state=CASE WHEN :score >= .7 THEN 'quarantined' ELSE trust_state END
                    WHERE device_id=:device"""),
            {
                "observed": body.observed_at,
                "risk": anomaly_score * 100,
                "score": anomaly_score,
                "device": body.device_id,
            },
        )
    return {"accepted": True, "anomaly_score": anomaly_score, "reasons": reasons}


@app.get("/v1/posture")
async def posture(
    principal: Annotated[
        Principal, Depends(require_roles("security", "auditor", "executive", "device_provisioner"))
    ],
):
    async for session in tenant_session(principal.tenant_id):
        row = (
            (
                await session.execute(
                    text("""SELECT count(*) total,
                    count(*) FILTER (WHERE trust_state='trusted') trusted,
                    count(*) FILTER (WHERE trust_state='quarantined') quarantined,
                    coalesce(avg(risk_score),0) average_risk
                    FROM iomt_devices""")
                )
            )
            .mappings()
            .one()
        )
    return dict(row)
