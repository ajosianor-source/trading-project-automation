import re
from typing import Annotated, Any

from fastapi import Depends, HTTPException, UploadFile
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("interoperability-gateway")
FHIR_TYPES = {"Patient", "Observation", "Condition", "Encounter", "MedicationRequest"}
HL7_MESSAGE = re.compile(r"^MSH\|")
HL7_ALLOWED_CONTROLS = {"\r", "\n", "\t"}


def valid_hl7_message(message: str) -> bool:
    segments = [segment for segment in message.split("\r") if segment]
    invalid_control = any(
        ord(character) < 32 and character not in HL7_ALLOWED_CONTROLS for character in message
    )
    return (
        len(message) <= 1_000_000
        and len(segments) <= 10_000
        and not invalid_control
        and bool(HL7_MESSAGE.match(message))
    )


class FhirResource(BaseModel):
    resourceType: str = Field(pattern=r"^[A-Z][A-Za-z]+$")  # noqa: N815
    id: str | None = Field(default=None, pattern=r"^[A-Za-z0-9\-.]{1,64}$")
    meta: dict[str, Any] | None = None


@app.post("/v1/fhir/$validate")
async def validate_fhir(
    resource: FhirResource,
    _: Annotated[Principal, Depends(require_roles("clinician", "integration", "developer"))],
):
    issues = []
    if resource.resourceType not in FHIR_TYPES:
        issues.append({"severity": "error", "code": "not-supported"})
    return {
        "resourceType": "OperationOutcome",
        "issue": issues or [{"severity": "information", "code": "informational"}],
    }


@app.post("/v1/hl7v2")
async def ingest_hl7(
    payload: bytes,
    _: Annotated[Principal, Depends(require_roles("integration", "clinical_system"))],
):
    message = payload.decode("utf-8", errors="strict").replace("\r\n", "\r")
    if not valid_hl7_message(message):
        raise HTTPException(status_code=422, detail="Invalid HL7 v2 message")
    fields = message.split("\r", 1)[0].split("|")
    return {"accepted": True, "message_type": fields[8] if len(fields) > 8 else "unknown"}


@app.post("/v1/dicom/metadata")
async def inspect_dicom(
    file: UploadFile,
    _: Annotated[Principal, Depends(require_roles("radiology", "integration"))],
):
    if file.content_type not in {"application/dicom", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="DICOM content type required")
    prefix = await file.read(132)
    if len(prefix) < 132 or prefix[128:132] != b"DICM":
        raise HTTPException(status_code=422, detail="DICOM preamble not found")
    return {"valid_preamble": True, "quarantine_required": True, "pixel_data_processed": False}


@app.get("/.well-known/smart-configuration")
async def smart_configuration():
    return {
        "authorization_endpoint": "https://auth.example.health/authorize",
        "token_endpoint": "https://auth.example.health/oauth/token",
        "capabilities": ["launch-ehr", "client-public", "context-ehr-patient", "permission-v2"],
        "code_challenge_methods_supported": ["S256"],
    }
