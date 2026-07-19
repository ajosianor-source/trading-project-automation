# ruff: noqa: S101

from datetime import UTC

import pytest
from schemas import StoreEnvelope

from services.normalize import NormalizationError, Normalizer


def normalizer() -> Normalizer:
    return Normalizer(
        "a-production-sized-test-tokenization-secret",
        "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
        "test-v1",
    )


def test_fhir_normalization_tokenizes_patient_and_omits_name() -> None:
    result = normalizer().normalize(
        "fhir",
        "hospital-a",
        StoreEnvelope(
            payload={
                "resourceType": "Patient",
                "id": "patient-123",
                "name": [{"family": "Sensitive"}],
                "birthDate": "1980-02-03",
            }
        ),
    )
    assert result["patient_token"].startswith("pt_")
    assert "Sensitive" not in result["display"]
    assert result["birth_year"] == 1980
    assert result["observed_at"].tzinfo == UTC


def test_missing_values_receive_safe_defaults() -> None:
    result = normalizer().normalize(
        "dicom", "hospital-a", StoreEnvelope(payload={"Modality": "CT"})
    )
    assert result["study_uid"] == "unknown"
    assert result["instance_count"] == 1
    assert result["quarantine_status"] == "pending"


def test_iomt_requires_device_identity() -> None:
    with pytest.raises(NormalizationError, match="device_id"):
        normalizer().normalize("iomt", "hospital-a", StoreEnvelope(payload={}))


def test_replayed_payload_has_stable_integrity_hash() -> None:
    body = StoreEnvelope(payload={"message_type": "ADT_A01", "patient_id": "42"})
    first = normalizer().normalize("hl7", "hospital-a", body)
    second = normalizer().normalize("hl7", "hospital-a", body)
    assert first["integrity_sha256"] == second["integrity_sha256"]
    assert first["patient_token"] == second["patient_token"]
