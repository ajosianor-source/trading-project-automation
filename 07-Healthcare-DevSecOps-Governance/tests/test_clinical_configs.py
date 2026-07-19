import json
from pathlib import Path

ROOT = Path(__file__).parents[1]


def test_fhir_capability_is_r4_and_smart_enabled():
    statement = json.loads(
        (ROOT / "interop" / "fhir" / "capability-statement.json").read_text(encoding="utf-8")
    )
    assert statement["resourceType"] == "CapabilityStatement"
    assert statement["fhirVersion"] == "4.0.1"
    security = statement["rest"][0]["security"]["service"][0]["coding"][0]["code"]
    assert security == "SMART-on-FHIR"


def test_dicom_quarantine_is_not_remote():
    config = json.loads((ROOT / "interop" / "dicom" / "orthanc.json").read_text(encoding="utf-8"))
    assert config["RemoteAccessAllowed"] is False
    assert config["AuthenticationEnabled"] is True
    assert config["DicomTlsEnabled"] is True
