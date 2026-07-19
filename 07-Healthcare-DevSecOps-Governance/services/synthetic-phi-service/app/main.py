import hashlib
import random
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import Depends
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("synthetic-phi-service")


class GenerationRequest(BaseModel):
    count: int = Field(default=10, ge=1, le=500)
    seed: str | None = Field(default=None, min_length=16, max_length=128)
    publish: bool = False


class SyntheaBundle(BaseModel):
    resourceType: Literal["Bundle"]  # noqa: N815
    type: str
    entry: list[dict] = Field(max_length=10_000)


@app.post("/v1/synthea/load", status_code=202)
async def load_synthea(
    bundle: SyntheaBundle,
    principal: Annotated[Principal, Depends(require_roles("developer", "data_steward"))],
):
    resources = [entry.get("resource", {}) for entry in bundle.entry]
    counts: dict[str, int] = {}
    for resource in resources:
        resource_type = str(resource.get("resourceType", "Unknown"))
        counts[resource_type] = counts.get(resource_type, 0) + 1
    return {
        "accepted": len(resources),
        "tenant_id": principal.tenant_id,
        "classification": "SYNTHETIC",
        "resource_counts": counts,
        "route": "clinical.synthetic.normalized.v1",
    }


def _rng(seed: str | None) -> tuple[random.Random, str]:
    value = seed or secrets.token_hex(32)
    digest = hashlib.sha256(value.encode()).hexdigest()
    return random.Random(int(digest[:16], 16)), digest  # noqa: S311 - deterministic test data


def _patient(index: int, rng: random.Random) -> dict:
    patient_id = f"syn-{uuid4()}"
    year = rng.randint(1940, 2015)
    return {
        "resourceType": "Patient",
        "id": patient_id,
        "meta": {"tag": [{"system": "urn:healthgov:data-origin", "code": "synthetic"}]},
        "identifier": [{"system": "urn:healthgov:synthetic", "value": f"SYN-{index:08d}"}],
        "name": [{"family": f"Simulated-{index}", "given": ["Synthetic"]}],
        "gender": rng.choice(["female", "male", "unknown"]),
        "birthDate": f"{year}-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d}",
    }


@app.post("/v1/generate/fhir")
async def generate_fhir(
    body: GenerationRequest,
    principal: Annotated[Principal, Depends(require_roles("developer", "data_steward"))],
):
    rng, seed_token = _rng(body.seed)
    patients = [_patient(index, rng) for index in range(body.count)]
    entries = []
    for patient in patients:
        entries.extend(
            [
                {"fullUrl": f"urn:uuid:{patient['id']}", "resource": patient},
                {
                    "resource": {
                        "resourceType": "Observation",
                        "id": str(uuid4()),
                        "status": "final",
                        "subject": {"reference": f"Patient/{patient['id']}"},
                        "code": {"coding": [{"system": "http://loinc.org", "code": "8867-4"}]},
                        "valueQuantity": {"value": rng.randint(55, 120), "unit": "/min"},
                        "effectiveDateTime": datetime.now(UTC).isoformat(),
                        "meta": {
                            "tag": [{"system": "urn:healthgov:data-origin", "code": "synthetic"}]
                        },
                    }
                },
            ]
        )
    return {
        "dataset_id": str(uuid4()),
        "tenant_id": principal.tenant_id,
        "seed_token": seed_token,
        "synthetic": True,
        "publish_requested": body.publish,
        "bundle": {"resourceType": "Bundle", "type": "collection", "entry": entries},
    }


@app.post("/v1/generate/hl7")
async def generate_hl7(
    body: GenerationRequest,
    _: Annotated[Principal, Depends(require_roles("developer", "data_steward"))],
):
    rng, seed_token = _rng(body.seed)
    timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    messages = []
    for index in range(body.count):
        control = uuid4().hex[:20]
        messages.append(
            "\r".join(
                [
                    f"MSH|^~\\&|SYNTHETIC|HEALTHGOV|TARGET|TEST|{timestamp}||ADT^A01|{control}|T|2.5.1",
                    f"PID|1||SYN{index:08d}^^^HEALTHGOV^MR||SIMULATED^{index}||"
                    f"{rng.randint(1940, 2015)}0101|U",
                    f"PV1|1|O|SYNTHETIC^^^TEST||||||||||||||||{uuid4().hex[:12]}",
                ]
            )
            + "\r"
        )
    return {"seed_token": seed_token, "synthetic": True, "messages": messages}


@app.post("/v1/generate/compliance")
async def generate_compliance(
    body: GenerationRequest,
    _: Annotated[Principal, Depends(require_roles("developer", "compliance"))],
):
    rng, seed_token = _rng(body.seed)
    frameworks = ["HIPAA", "GDPR", "NHS_DSPT", "ISO27001", "SOC2"]
    events = [
        {
            "event_id": str(uuid4()),
            "framework": frameworks[index % len(frameworks)],
            "control_id": f"SYN-{index + 1}",
            "event_type": "evidence.observed",
            "source": "synthetic-phi-service",
            "status": rng.choice(["effective", "effective", "partial", "ineffective"]),
            "artifact_sha256": hashlib.sha256(
                f"synthetic:{seed_token}:{index}".encode()
            ).hexdigest(),
            "observed_at": datetime.now(UTC).isoformat(),
            "synthetic": True,
        }
        for index in range(body.count)
    ]
    return {"seed_token": seed_token, "events": events}


@app.post("/v1/generate/iomt")
async def generate_iomt(
    body: GenerationRequest,
    _: Annotated[Principal, Depends(require_roles("developer", "device_provisioner"))],
):
    rng, seed_token = _rng(body.seed)
    kinds = ["heart_monitor", "ventilator", "wearable", "imaging"]
    telemetry = []
    for index in range(body.count):
        kind = kinds[index % len(kinds)]
        telemetry.append(
            {
                "device_id": f"synthetic-{kind}-{index:05d}",
                "device_type": kind,
                "sequence": index,
                "observed_at": (datetime.now(UTC) + timedelta(seconds=index)).isoformat(),
                "metrics": {
                    "heart_rate": rng.randint(45, 160) if kind != "imaging" else None,
                    "battery_percent": rng.randint(20, 100),
                    "temperature_c": round(rng.uniform(33, 42), 2),
                },
                "synthetic": True,
            }
        )
    return {"seed_token": seed_token, "telemetry": telemetry}


@app.post("/v1/generate/all")
async def generate_all(
    body: GenerationRequest,
    principal: Annotated[
        Principal, Depends(require_roles("developer", "data_steward", "platform_admin"))
    ],
):
    return {
        "dataset_id": str(uuid4()),
        "tenant_id": principal.tenant_id,
        "requested_records_per_type": body.count,
        "status": "generation_accepted",
        "expires_at": (datetime.now(UTC) + timedelta(days=30)).isoformat(),
        "classification": "SYNTHETIC",
    }
