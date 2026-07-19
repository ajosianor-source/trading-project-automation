import hashlib
import hmac
import json
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException
from healthgov.config import get_settings
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field
from redis.asyncio import Redis

app = secure_app("iomt-security-hub")
redis = Redis.from_url(get_settings().redis_url, decode_responses=True)


class DeviceAttestation(BaseModel):
    device_id: str = Field(pattern=r"^[a-zA-Z0-9:_-]{8,128}$")
    manufacturer: str
    model: str
    firmware_version: str
    firmware_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    certificate_thumbprint: str = Field(pattern=r"^[A-Fa-f0-9]{64}$")
    secure_boot: bool
    measured_boot: dict[str, str]


class TelemetryEnvelope(BaseModel):
    device_id: str
    sequence: int = Field(ge=0)
    captured_at: datetime
    observations: dict[str, float | int | str]
    signature: str


def verify_telemetry_signature(body: TelemetryEnvelope, key: str) -> bool:
    if len(key) < 32:
        return False
    canonical = json.dumps(
        {
            "device_id": body.device_id,
            "sequence": body.sequence,
            "captured_at": body.captured_at.astimezone(UTC).isoformat(),
            "observations": body.observations,
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode()
    expected = hmac.new(key.encode(), canonical, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, body.signature)


@app.post("/v1/devices/attest")
async def attest(
    body: DeviceAttestation,
    _: Annotated[Principal, Depends(require_roles("device_provisioner", "security"))],
):
    failures = []
    if not body.secure_boot:
        failures.append("secure boot disabled")
    if not body.measured_boot:
        failures.append("measured boot evidence missing")
    return {
        "trusted": not failures,
        "device_identity": hashlib.sha256(
            f"{body.device_id}:{body.certificate_thumbprint}".encode()
        ).hexdigest(),
        "failures": failures,
        "certificate_profile": "IEEE-802.1AR-IDevID",
    }


@app.post("/v1/telemetry", status_code=202)
async def telemetry(
    body: TelemetryEnvelope,
    _: Annotated[Principal, Depends(require_roles("medical_device"))],
):
    now = datetime.now(UTC)
    captured = body.captured_at.astimezone(UTC)
    if abs((now - captured).total_seconds()) > 300:
        raise HTTPException(status_code=422, detail="Telemetry timestamp outside replay window")
    # Atomic monotonic sequence enforcement survives pod restarts and horizontal scaling.
    replay_key = f"iomt:sequence:{body.device_id}"
    script = """
    local current = redis.call('GET', KEYS[1])
    if current and tonumber(ARGV[1]) <= tonumber(current) then return 0 end
    redis.call('SET', KEYS[1], ARGV[1], 'EX', 2592000)
    return 1
    """
    if not await redis.eval(script, 1, replay_key, body.sequence):
        raise HTTPException(status_code=409, detail="Telemetry replay or out-of-order sequence")
    # The mTLS edge verifies IDevID. This application-level signature prevents a
    # compromised intermediary from forging telemetry inside the trusted network.
    if not verify_telemetry_signature(body, get_settings().iomt_signature_key):
        raise HTTPException(status_code=422, detail="Invalid detached telemetry signature")
    return {"accepted": True, "device_id": body.device_id, "sequence": body.sequence}
