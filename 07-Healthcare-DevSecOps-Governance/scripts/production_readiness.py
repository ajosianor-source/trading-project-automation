"""Fail-closed static release checks.

This complements scanners and live tests; it does not replace penetration testing,
clinical safety review, privacy assessment, or a production change approval.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = (
    "governance/production-gates.json",
    "SECURITY.md",
    "docs/operations/BACKUP-DR.md",
    "docs/operations/SLO.md",
    "docs/operations/ETHICAL-DATA-SOURCES.md",
    "docs/governance/CLINICAL-GOVERNANCE.md",
    "docs/security/SECURITY-ASSURANCE-PLAN.md",
    "docs/security/IDENTITY-SECRETS.md",
    "docs/architecture/PRODUCTION-PILOT.md",
    "ops/staging/approved-sources.json",
    "database/migrations/004_pilot_governance.sql",
    "governance/control-registry.json",
    "policies/healthcare/data_source_governance.rego",
    "infra/kubernetes/base/network-policy.yaml",
)


def evaluate(image_tag: str | None = None) -> dict[str, object]:
    failures: list[str] = []
    for relative in REQUIRED_FILES:
        if not (ROOT / relative).is_file():
            failures.append(f"missing required release artifact: {relative}")
    if image_tag is not None and not re.fullmatch(r"[0-9a-f]{40}", image_tag):
        failures.append("production image tag must be a full lowercase Git commit SHA")

    deployment = (ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")
    if "cosign verify" not in deployment:
        failures.append("production deployment does not verify image signatures")
    if "environment: production" not in deployment:
        failures.append("production deployment lacks protected environment")
    if re.search(r":(?:latest|main)\b", deployment):
        failures.append("production deployment permits mutable image tags")

    compose = (ROOT / "compose.yaml").read_text(encoding="utf-8")
    if "tmpfs: [/var/lib/postgresql/data]" in compose:
        failures.append("PostgreSQL is configured with disposable storage")

    auth = (ROOT / "services/local-auth-bff/app/main.py").read_text(encoding="utf-8")
    if "local-auth-bff is forbidden in production" not in auth:
        failures.append("staging identity provider has no production startup guard")

    ingestion = (ROOT / "services/data-ingestion/app/main.py").read_text(encoding="utf-8")
    if '@app.get("/readyz"' not in ingestion:
        failures.append("data ingestion has no dependency readiness endpoint")

    gateway = (ROOT / "gateway/envoy.yaml").read_text(encoding="utf-8")
    for route in ("/ingestion/", "/data-store/"):
        if route not in gateway:
            failures.append(f"gateway route missing: {route}")

    portal_sources = "\n".join(
        path.read_text(encoding="utf-8")
        for path in (ROOT / "portal").rglob("*.tsx")
        if "node_modules" not in path.parts and ".next" not in path.parts
    )
    if "@/lib/data/mock" in portal_sources:
        failures.append("dashboard source imports mock data")

    sources = json.loads((ROOT / "ops/staging/approved-sources.json").read_text())
    mimic = next(item for item in sources["sources"] if item["id"] == "mimic-iv")
    if mimic["approved"]:
        failures.append("MIMIC-IV is enabled without the controlled approval gate")

    return {
        "status": "pass" if not failures else "fail",
        "checks": len(REQUIRED_FILES) + 7,
        "failures": failures,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path)
    parser.add_argument("--image-tag")
    args = parser.parse_args()
    result = evaluate(args.image_tag)
    payload = json.dumps(result, indent=2)
    print(payload)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload + "\n", encoding="utf-8")
    return 0 if result["status"] == "pass" else 1


if __name__ == "__main__":
    raise SystemExit(main())
