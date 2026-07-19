import hashlib
import hmac
import json
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from app.models.envelope import ClinicalEnvelope, DataClassification, IngestionSource


class Normalizer:
    def __init__(self, tokenization_secret: str) -> None:
        if len(tokenization_secret) < 32:
            raise ValueError("TOKENIZATION_SECRET must contain at least 32 characters")
        self._secret = tokenization_secret.encode()

    def patient_token(self, source: IngestionSource, identifier: str | None) -> str | None:
        if not identifier:
            return None
        digest = hmac.new(
            self._secret,
            f"{source.value}:patient:{identifier}".encode(),
            hashlib.sha256,
        ).hexdigest()
        return f"pt_{digest[:32]}"

    def envelope(
        self,
        *,
        tenant_id: str,
        source: IngestionSource,
        source_id: str,
        event_type: str,
        classification: DataClassification,
        observed_at: datetime,
        payload_schema: str,
        payload: dict[str, Any],
        patient_identifier: str | None = None,
        device_id: str | None = None,
        provenance: dict[str, str] | None = None,
        trace_id: str | None = None,
    ) -> ClinicalEnvelope:
        canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
        return ClinicalEnvelope(
            tenant_id=tenant_id,
            source=source,
            source_id=source_id,
            event_type=event_type,
            classification=classification,
            patient_token=self.patient_token(source, patient_identifier),
            device_id=device_id,
            observed_at=observed_at.astimezone(UTC),
            payload_schema=payload_schema,
            payload=payload,
            provenance=provenance or {},
            integrity_sha256=hashlib.sha256(canonical.encode()).hexdigest(),
            trace_id=trace_id or uuid4().hex,
        )

    def fhir(
        self, tenant_id: str, resource: dict[str, Any], *, synthetic: bool = False
    ) -> ClinicalEnvelope:
        resource_type = str(resource.get("resourceType", "Unknown"))
        resource_id = str(resource.get("id") or uuid4())
        patient_ref = _fhir_patient_reference(resource)
        observed = _parse_datetime(
            resource.get("effectiveDateTime")
            or resource.get("issued")
            or resource.get("meta", {}).get("lastUpdated")
        )
        return self.envelope(
            tenant_id=tenant_id,
            source=IngestionSource.synthea if synthetic else IngestionSource.fhir,
            source_id=f"{resource_type}/{resource_id}",
            event_type=f"fhir.{resource_type.lower()}",
            classification=DataClassification.synthetic if synthetic else DataClassification.phi,
            observed_at=observed,
            payload_schema=f"hl7.fhir.r4.{resource_type}",
            payload=resource,
            patient_identifier=patient_ref,
            provenance={
                "standard": "FHIR R4",
                "resource_version": str(resource.get("meta", {}).get("versionId", "")),
            },
        )

    def hl7v2(self, tenant_id: str, fields: dict[str, Any]) -> ClinicalEnvelope:
        return self.envelope(
            tenant_id=tenant_id,
            source=IngestionSource.hl7v2,
            source_id=str(fields["message_control_id"]),
            event_type=f"hl7v2.{str(fields['message_type']).lower()}",
            classification=DataClassification.phi,
            observed_at=_parse_datetime(fields.get("message_datetime")),
            payload_schema=f"hl7.v2.{fields.get('version', 'unknown')}.{fields['message_type']}",
            payload=fields,
            patient_identifier=str(fields.get("patient_id") or ""),
            provenance={
                "standard": "HL7 v2",
                "sending_application": str(fields.get("sending_application", "")),
            },
        )

    def dicom(
        self,
        tenant_id: str,
        metadata: dict[str, Any],
        *,
        classification: DataClassification = DataClassification.phi,
        provenance: dict[str, str] | None = None,
    ) -> ClinicalEnvelope:
        source_id = str(metadata.get("SOPInstanceUID") or uuid4())
        return self.envelope(
            tenant_id=tenant_id,
            source=IngestionSource.dicom,
            source_id=source_id,
            event_type="dicom.instance",
            classification=classification,
            observed_at=_parse_dicom_datetime(metadata),
            payload_schema="dicom.metadata.v1",
            payload=metadata,
            patient_identifier=str(metadata.get("PatientID") or ""),
            provenance={
                "standard": "DICOM",
                "transfer_syntax": str(metadata.get("TransferSyntaxUID", "")),
                **(provenance or {}),
            },
        )

    def iomt(self, tenant_id: str, telemetry: dict[str, Any]) -> ClinicalEnvelope:
        device_id = str(telemetry["device_id"])
        return self.envelope(
            tenant_id=tenant_id,
            source=IngestionSource.iomt,
            source_id=f"{device_id}:{telemetry['sequence']}",
            event_type="iomt.telemetry",
            classification=DataClassification.device_telemetry,
            observed_at=_parse_datetime(telemetry["observed_at"]),
            payload_schema="healthgov.iomt.telemetry.v1",
            payload={"sequence": telemetry["sequence"], "measurements": telemetry["measurements"]},
            device_id=device_id,
            provenance={
                "transport": str(telemetry.get("transport", "https")),
                "signature": "verified-at-edge",
            },
        )

    def public_iomt(
        self, tenant_id: str, telemetry: dict[str, Any], dataset: str
    ) -> ClinicalEnvelope:
        envelope = self.iomt(tenant_id, telemetry)
        return envelope.model_copy(
            update={
                "classification": DataClassification.public_deidentified,
                "provenance": {
                    **envelope.provenance,
                    "dataset": dataset,
                    "license": "ODC-By-1.0",
                    "attribution_required": "true",
                },
            }
        )

    def mimic(self, tenant_id: str, table: str, row: dict[str, Any]) -> ClinicalEnvelope:
        row_id = str(row.get("stay_id") or row.get("hadm_id") or row.get("subject_id") or uuid4())
        observed = _parse_datetime(
            row.get("charttime") or row.get("admittime") or row.get("anchor_year")
        )
        return self.envelope(
            tenant_id=tenant_id,
            source=IngestionSource.mimic,
            source_id=f"{table}:{row_id}",
            event_type=f"icu.{table}",
            classification=DataClassification.deidentified,
            observed_at=observed,
            payload_schema=f"mimiciv.{table}.v3",
            payload=row,
            patient_identifier=str(row.get("subject_id") or ""),
            provenance={"dataset": "MIMIC-IV", "table": table},
        )


def _fhir_patient_reference(resource: dict[str, Any]) -> str | None:
    for key in ("subject", "patient", "beneficiary"):
        reference = resource.get(key)
        if isinstance(reference, dict) and reference.get("reference"):
            return str(reference["reference"]).removeprefix("Patient/")
    if resource.get("resourceType") == "Patient":
        return str(resource.get("id") or "")
    return None


def _parse_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=UTC)
    if value is not None:
        text = str(value).replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(text)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
        except ValueError:
            pass
    return datetime.now(UTC)


def _parse_dicom_datetime(metadata: dict[str, Any]) -> datetime:
    date = str(metadata.get("StudyDate", ""))
    time = str(metadata.get("StudyTime", "000000")).split(".")[0].ljust(6, "0")
    try:
        return datetime.strptime(f"{date}{time}", "%Y%m%d%H%M%S").replace(tzinfo=UTC)
    except ValueError:
        return datetime.now(UTC)
