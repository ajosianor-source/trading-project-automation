import importlib.util
from pathlib import Path

from fastapi.testclient import TestClient
from healthgov.middleware import secure_app

ROOT = Path(__file__).resolve().parents[1]


def _read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_api_security_headers_and_dangerous_methods():
    client = TestClient(secure_app("security-test"))
    response = client.get("/healthz", headers={"X-Request-ID": "bad request id\r\n"})
    assert response.status_code == 200
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["content-security-policy"] == (
        "default-src 'none'; frame-ancestors 'none'"
    )
    assert response.headers["x-request-id"] != "bad request id\r\n"
    assert client.request("TRACE", "/healthz").status_code == 405


def test_local_identity_fails_closed_in_production(monkeypatch):
    path = ROOT / "services/local-auth-bff/app/main.py"
    spec = importlib.util.spec_from_file_location("local_auth_bff_security_test", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("ALLOW_STAGING_SESSION", "true")
    try:
        module.assert_staging_only()
    except RuntimeError as exc:
        assert "forbidden in production" in str(exc)
    else:
        raise AssertionError("staging identity provider started in production")


def test_gateway_and_workload_security_boundaries_are_present():
    gateway = _read("gateway/envoy.yaml")
    assert "require_client_certificate: true" in gateway
    assert "TLSv1_3" in gateway
    assert "envoy.filters.http.jwt_authn" in gateway
    assert "envoy.filters.http.rbac" in gateway
    assert "/ingestion/" in gateway and "/data-store/" in gateway

    workloads = _read("infra/kubernetes/base/data-plane.yaml")
    assert "runAsNonRoot: true" in workloads
    assert "readOnlyRootFilesystem: true" in workloads
    assert "allowPrivilegeEscalation: false" in workloads
    assert "drop: [ALL]" in workloads


def test_release_gate_evaluator_passes():
    path = ROOT / "scripts/production_readiness.py"
    spec = importlib.util.spec_from_file_location("production_readiness", path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    assert module.evaluate()["failures"] == []
    assert module.evaluate("latest")["status"] == "fail"
    assert module.evaluate("a" * 40)["status"] == "pass"
