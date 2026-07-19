import re
from typing import Annotated, Any

from fastapi import Depends
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("phi-classifier")

PATTERNS = {
    "email": re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", re.I),
    "ssn": re.compile(r"^\d{3}-?\d{2}-?\d{4}$"),
    "phone": re.compile(r"^\+?[\d ().-]{7,20}$"),
    "medical_record_number": re.compile(r"^(mrn|patient)[-_]?\d+$", re.I),
}
PHI_FIELD_NAMES = {
    "name",
    "first_name",
    "last_name",
    "email",
    "phone",
    "address",
    "dob",
    "date_of_birth",
    "ssn",
    "mrn",
    "medical_record_number",
    "diagnosis",
    "patient_id",
    "identifier",
    "telecom",
    "birthdate",
    "deceaseddatetime",
    "generalpractitioner",
}


class ClassificationRequest(BaseModel):
    schema_name: str = Field(min_length=1, max_length=128)
    fields: dict[str, Any]


class Finding(BaseModel):
    field: str
    classification: str
    confidence: float
    controls: list[str]


@app.post("/v1/classify", response_model=list[Finding])
async def classify(
    body: ClassificationRequest,
    _: Annotated[Principal, Depends(require_roles("developer", "security", "privacy_officer"))],
):
    findings: list[Finding] = []
    for field, sample in _walk(body.fields):
        normalized = field.rsplit(".", 1)[-1].replace("-", "_").lower()
        matched_type = next(
            (kind for kind, pattern in PATTERNS.items() if pattern.match(str(sample))), None
        )
        if normalized in PHI_FIELD_NAMES or matched_type:
            findings.append(
                Finding(
                    field=field,
                    classification=f"PHI.{matched_type or normalized}",
                    confidence=0.98 if normalized in PHI_FIELD_NAMES else 0.85,
                    controls=[
                        "encrypt:aes-256-gcm",
                        "tls:1.3",
                        "audit:required",
                        "retention:policy",
                    ],
                )
            )
    return findings


def _walk(value: Any, path: str = ""):
    """Traverse nested FHIR/clinical JSON and report precise field paths."""
    if isinstance(value, dict):
        for key, child in value.items():
            next_path = f"{path}.{key}" if path else key
            yield from _walk(child, next_path)
    elif isinstance(value, list):
        for index, child in enumerate(value[:100]):
            yield from _walk(child, f"{path}[{index}]")
    else:
        yield path, value
