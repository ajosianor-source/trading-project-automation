from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path

REQUIRED_APPROVALS = {"SECURITY", "PRIVACY", "CLINICAL_SAFETY", "OPERATIONS"}
REQUIRED_TESTS = {
    "tenant_isolation", "rbac", "opa", "purpose_of_use", "break_glass",
    "audit_chain", "ssrf", "dicom_isolation", "hl7_abuse", "iomt_replay",
    "rate_limit", "backup_restore", "dast", "penetration_test",
}


def verify(document: dict) -> list[str]:
    failures: list[str] = []
    vulnerabilities = document.get("vulnerabilities", {})
    if vulnerabilities.get("critical", 1) or vulnerabilities.get("high", 1):
        failures.append("critical/high vulnerabilities remain")
    passed = {name for name, status in document.get("tests", {}).items() if status == "passed"}
    failures.extend(f"required test not passed: {name}" for name in sorted(REQUIRED_TESTS - passed))
    approvals = {
        item["type"] for item in document.get("approvals", [])
        if item.get("status") == "approved"
    }
    failures.extend(f"missing approval: {name}" for name in sorted(REQUIRED_APPROVALS - approvals))
    now = datetime.now(UTC)
    for evidence in document.get("compliance_evidence", []):
        expires = datetime.fromisoformat(evidence["expires_at"].replace("Z", "+00:00"))
        if expires <= now:
            failures.append(f"expired compliance evidence: {evidence['control_id']}")
    if not document.get("signed_images") or not document.get("signed_sboms"):
        failures.append("images and SBOMs must be signed")
    if document.get("rpo_minutes", 10**9) > document.get("rpo_target_minutes", 15):
        failures.append("RPO target not demonstrated")
    if document.get("rto_minutes", 10**9) > document.get("rto_target_minutes", 60):
        failures.append("RTO target not demonstrated")
    return failures


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("evidence", type=Path)
    args = parser.parse_args()
    document = json.loads(args.evidence.read_text(encoding="utf-8"))
    failures = verify(document)
    print(json.dumps({"status": "fail" if failures else "pass", "failures": failures}, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
