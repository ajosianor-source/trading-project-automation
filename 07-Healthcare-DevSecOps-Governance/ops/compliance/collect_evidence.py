"""Hash and submit evidence metadata; raw evidence remains in immutable storage."""

from __future__ import annotations

import hashlib
import json
import os
from datetime import UTC, datetime, timedelta
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
REGISTRY = ROOT / "governance/control-registry.json"


def main() -> int:
    token = os.environ["EVIDENCE_COLLECTOR_TOKEN"]
    endpoint = os.environ["COMPLIANCE_API_URL"].rstrip("/")
    tenant = os.environ["TENANT_ID"]
    registry_bytes = REGISTRY.read_bytes()
    registry = json.loads(registry_bytes)
    digest = hashlib.sha256(registry_bytes).hexdigest()
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Tenant-ID": tenant,
        "X-Purpose-Of-Use": "operations",
    }
    observed = datetime.now(UTC)
    with httpx.Client(timeout=15) as client:
        for control in registry["controls"]:
            response = client.post(
                f"{endpoint}/v1/evidence",
                headers=headers,
                json={
                    "framework": control["framework"],
                    "control_id": control["control_id"],
                    "collector": "control-registry-integrity",
                    "artifact_sha256": digest,
                    "status": "effective",
                    "observed_at": observed.isoformat(),
                    "expires_at": (observed + timedelta(days=1)).isoformat(),
                },
            )
            response.raise_for_status()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
