import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from schemas.common import StoreEnvelope


class NormalizationError(ValueError):
    pass


class Normalizer:
    def __init__(self, tokenization_secret: str, encryption_key: str, key_version: str) -> None:
        self._secret = tokenization_secret.encode()
        key = base64.b64decode(encryption_key, validate=True)
        if len(key) != 32:
            raise ValueError("PHI_ENCRYPTION_KEY must decode to exactly 32 bytes")
        self._cipher = AESGCM(key)
        self._key_version = key_version

    def normalize(self, source: str, tenant_id: str, value: StoreEnvelope) -> dict[str, Any]:
        payload = value.payload or {}
        observed_at = _aware(value.observed_at or _source_datetime(source, payload))
        source_id = value.source_id or _source_id(source, payload)
        patient_token = value.patient_token or self._tokenize(
            tenant_id, _patient_identifier(source, payload)
        )
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
        aad = f"{tenant_id}:{source}:{value.event_id}".encode()
        nonce = __import__("os").urandom(12)
        encrypted = nonce + self._cipher.encrypt(nonce, canonical.encode(), aad)
        common: dict[str, Any] = {
            "event_id": value.event_id,
            "tenant_id": tenant_id,
            "source_id": source_id,
            "event_type": value.event_type or _event_type(source, payload),
            "classification": value.classification or _classification(source),
            "patient_token": patient_token,
            "device_id": value.device_id or _string(payload.get("device_id")),
            "observed_at": observed_at,
            "ingested_at": _aware(value.ingested_at),
            "payload_schema": value.payload_schema or f"healthgov.{source}.v1",
            # Only a minimum, de-identified projection remains queryable. The complete
            # source record is authenticated-encrypted and must be accessed via a
            # separately audited break-glass workflow.
            "payload": _safe_projection(source, payload),
            "payload_ciphertext": base64.b64encode(encrypted).decode(),
            "key_version": self._key_version,
            "provenance": value.provenance,
            "integrity_sha256": value.integrity_sha256
            or hashlib.sha256(canonical.encode()).hexdigest(),
            "trace_id": value.trace_id or uuid4().hex,
        }
        return common | self._source_fields(source, patient_token, payload)

    def _tokenize(self, tenant_id: str, identifier: str | None) -> str | None:
        if not identifier:
            return None
        digest = hmac.new(
            self._secret, f"{tenant_id}:patient:{identifier}".encode(), hashlib.sha256
        ).hexdigest()
        return f"pt_{digest[:32]}"

    @staticmethod
    def _source_fields(
        source: str, patient_token: str | None, payload: dict[str, Any]
    ) -> dict[str, Any]:
        if source == "fhir":
            resource_type = _string(payload.get("resourceType")) or "Unknown"
            birth_date = _string(payload.get("birthDate"))
            return {
                "resource_type": resource_type,
                "resource_version": _string(_nested(payload, "meta", "versionId")),
                # Direct patient names never enter the dashboard projection.
                "display": f"Patient {patient_token[-6:]}" if patient_token else resource_type,
                "birth_year": _int(birth_date[:4]) if birth_date else None,
                "gender": _string(payload.get("gender")),
            }
        if source == "hl7":
            return {
                "message_type": _string(payload.get("message_type")) or "UNKNOWN",
                "sending_application": _string(payload.get("sending_application")),
                "facility": _string(payload.get("sending_facility") or payload.get("facility")),
                "processing_status": _string(payload.get("status")) or "accepted",
            }
        if source == "dicom":
            return {
                "study_uid": _string(payload.get("StudyInstanceUID"))
                or _string(payload.get("study_uid"))
                or "unknown",
                "modality": _string(payload.get("Modality")) or "OT",
                "body_part": _string(payload.get("BodyPartExamined")),
                "instance_count": _int(payload.get("instance_count")) or 1,
                "quarantine_status": _string(payload.get("quarantine_status")) or "pending",
            }
        if source == "iomt":
            if not (_string(payload.get("device_id"))):
                raise NormalizationError("IoMT payload requires device_id")
            return {
                "sequence": _int(payload.get("sequence")) or 0,
                "measurements": payload.get("measurements") or {},
                "trust_status": _string(payload.get("trust_status")) or "review",
            }
        if source == "icu":
            return {
                "stay_token": _string(payload.get("stay_token") or payload.get("stay_id"))
                or "unknown",
                "heart_rate": _float(payload.get("heart_rate") or payload.get("heartrate")),
                "spo2": _float(payload.get("spo2")),
                "systolic_bp": _float(payload.get("systolic_bp") or payload.get("sbp")),
                "respiratory_rate": _float(
                    payload.get("respiratory_rate") or payload.get("resprate")
                ),
            }
        raise NormalizationError(f"Unsupported source: {source}")


def _source_id(source: str, payload: dict[str, Any]) -> str:
    candidates = {
        "fhir": payload.get("id"),
        "hl7": payload.get("message_control_id"),
        "dicom": payload.get("SOPInstanceUID"),
        "iomt": (
            f"{payload.get('device_id')}:{payload.get('sequence')}"
            if payload.get("device_id") is not None
            else None
        ),
        "icu": payload.get("event_id") or payload.get("stay_id"),
    }
    return _string(candidates.get(source)) or uuid4().hex


def _event_type(source: str, payload: dict[str, Any]) -> str:
    if source == "fhir":
        return f"fhir.{(_string(payload.get('resourceType')) or 'unknown').lower()}"
    if source == "hl7":
        return f"hl7v2.{(_string(payload.get('message_type')) or 'unknown').lower()}"
    return {"dicom": "dicom.instance", "iomt": "iomt.telemetry", "icu": "icu.vital"}[source]


def _classification(source: str) -> str:
    return {"iomt": "DEVICE_TELEMETRY", "icu": "DEIDENTIFIED"}.get(source, "PHI")


def _patient_identifier(source: str, payload: dict[str, Any]) -> str | None:
    if source == "fhir":
        if payload.get("resourceType") == "Patient":
            return _string(payload.get("id"))
        reference = _nested(payload, "subject", "reference") or _nested(
            payload, "patient", "reference"
        )
        return _string(reference).removeprefix("Patient/") if reference else None
    keys = {
        "hl7": ("patient_id",),
        "dicom": ("PatientID",),
        "icu": ("subject_id", "patient_id"),
        "iomt": (),
    }
    return next((_string(payload.get(key)) for key in keys[source] if payload.get(key)), None)


def _source_datetime(source: str, payload: dict[str, Any]) -> datetime:
    keys = {
        "fhir": ("effectiveDateTime", "issued"),
        "hl7": ("message_datetime",),
        "dicom": (),
        "iomt": ("observed_at",),
        "icu": ("charttime", "observed_at"),
    }
    for key in keys[source]:
        parsed = _datetime(payload.get(key))
        if parsed:
            return parsed
    return datetime.now(UTC)


def _datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return _aware(value)
    if value:
        try:
            return _aware(datetime.fromisoformat(str(value).replace("Z", "+00:00")))
        except ValueError:
            return None
    return None


def _aware(value: datetime) -> datetime:
    return value.astimezone(UTC) if value.tzinfo else value.replace(tzinfo=UTC)


def _nested(value: dict[str, Any], *path: str) -> Any:
    current: Any = value
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def _string(value: Any) -> str | None:
    return str(value).strip() if value is not None and str(value).strip() else None


def _int(value: Any) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _float(value: Any) -> float | None:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


_DIRECT_IDENTIFIERS = {
    "name", "firstname", "lastname", "family", "given", "address", "telecom",
    "phone", "email", "patientid", "patient_id", "subject_id", "birthdate",
    "identifier", "photo", "contact",
}


def _safe_projection(source: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Recursively redact direct identifiers from operational JSON projections."""
    def scrub(value: Any) -> Any:
        if isinstance(value, dict):
            return {
                key: scrub(item)
                for key, item in value.items()
                if key.lower().replace("-", "_") not in _DIRECT_IDENTIFIERS
            }
        if isinstance(value, list):
            return [scrub(item) for item in value[:100]]
        return value

    safe = scrub(payload)
    # DICOM private tags can contain unstructured PHI and are never projected.
    if source == "dicom":
        safe.pop("private_tags", None)
        safe.pop("PrivateTags", None)
    return safe
