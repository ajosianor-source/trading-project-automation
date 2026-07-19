import hashlib
import hmac
import importlib.util
import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, relative: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_malicious_fhir_pagination_cannot_escape_private_hapi():
    module = load_module(
        "pilot_fhir_security", "services/data-ingestion/app/services/fhir_security.py"
    )
    bundle = {
        "resourceType": "Bundle",
        "link": [{"relation": "next", "url": "http://169.254.169.254/latest/meta-data"}],
    }
    with pytest.raises(ValueError, match="change origin"):
        module.safe_next_url("https://hapi.internal/fhir/", bundle)


def test_hl7_control_character_and_segment_flood_are_rejected():
    module = load_module(
        "pilot_interop", "services/interoperability-gateway/app/main.py"
    )
    assert module.valid_hl7_message("MSH|^~\\&|A|B|C|D|202601010000||ADT^A01\rPID|1")
    assert not module.valid_hl7_message("MSH|^~\\&|A\x00B")
    assert not module.valid_hl7_message("MSH|" + "\rOBX|1" * 10_001)


def test_forged_iomt_signature_is_rejected():
    module = load_module(
        "pilot_iomt", "services/iomt-security-hub/app/main.py"
    )
    body = module.TelemetryEnvelope(
        device_id="device-1234",
        sequence=7,
        captured_at=datetime.now(UTC),
        observations={"heart_rate": 72},
        signature="0" * 64,
    )
    key = "k" * 32
    assert not module.verify_telemetry_signature(body, key)
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
    body.signature = hmac.new(key.encode(), canonical, hashlib.sha256).hexdigest()
    assert module.verify_telemetry_signature(body, key)


def test_dicom_pixel_data_is_never_read_by_ingestion():
    source = (ROOT / "services/data-ingestion/app/pipelines/dicom_ingest.py").read_text()
    assert "stop_before_pixels=True" in source
    gateway = (ROOT / "services/interoperability-gateway/app/main.py").read_text()
    assert '"pixel_data_processed": False' in gateway


def test_staging_identity_and_mimic_are_prohibited_in_production():
    auth = (ROOT / "services/local-auth-bff/app/main.py").read_text()
    assert "forbidden in production" in auth
    catalogue = json.loads((ROOT / "ops/staging/approved-sources.json").read_text())
    mimic = next(item for item in catalogue["sources"] if item["id"] == "mimic-iv")
    assert mimic["approved"] is False


def test_gateway_rate_limit_and_request_buffer_are_fail_closed():
    gateway = (ROOT / "gateway/envoy.yaml").read_text()
    assert "envoy.filters.http.local_ratelimit" in gateway
    assert "max_request_bytes: 10485760" in gateway
    assert "require_client_certificate: true" in gateway
