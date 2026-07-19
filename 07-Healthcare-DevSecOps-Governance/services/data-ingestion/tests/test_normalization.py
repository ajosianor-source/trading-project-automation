from datetime import UTC, datetime

from app.models.envelope import DataClassification, IngestionSource
from app.services.normalization import Normalizer


def test_fhir_normalization_is_deterministic_and_tenant_scoped():
    normalizer = Normalizer("x" * 32)
    resource = {
        "resourceType": "Observation",
        "id": "obs-1",
        "subject": {"reference": "Patient/patient-1"},
        "effectiveDateTime": "2026-01-02T03:04:05Z",
        "status": "final",
    }
    first = normalizer.fhir("hospital-a", resource)
    second = normalizer.fhir("hospital-a", resource)
    assert first.source == IngestionSource.fhir
    assert first.classification == DataClassification.phi
    assert first.patient_token == second.patient_token
    assert first.integrity_sha256 == second.integrity_sha256
    assert "patient-1" not in first.patient_token


def test_mimic_is_marked_deidentified():
    envelope = Normalizer("x" * 32).mimic(
        "research-a",
        "chartevents",
        {"subject_id": 42, "stay_id": 7, "charttime": "2026-01-01T00:00:00"},
    )
    assert envelope.classification == DataClassification.deidentified
    assert envelope.observed_at == datetime(2026, 1, 1, tzinfo=UTC)
