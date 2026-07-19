"""Load only governance-approved staging sources.

Downloads are intentionally explicit. The script never downloads MIMIC-IV and never
accepts source metadata from command-line callers without matching the signed catalogue.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
CATALOGUE = ROOT / "ops/staging/approved-sources.json"


def load_catalogue() -> dict:
    return json.loads(CATALOGUE.read_text(encoding="utf-8"))


def auth_headers() -> dict[str, str]:
    token = os.environ.get("STAGING_INGESTION_TOKEN")
    if not token:
        raise RuntimeError("STAGING_INGESTION_TOKEN must come from Vault/secret manager")
    return {
        "Authorization": f"Bearer {token}",
        "X-Purpose-Of-Use": "operations",
        "X-Tenant-ID": os.environ["STAGING_TENANT_ID"],
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default="https://api.staging.healthgov.example/ingestion")
    parser.add_argument("--synthea-dir", type=Path, required=True)
    parser.add_argument("--bidmc-dir", type=Path, required=True)
    parser.add_argument("--tcia-dir", type=Path, required=True)
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args()

    catalogue = load_catalogue()
    if catalogue["phi_permitted"] is not False:
        raise RuntimeError("Real PHI is prohibited in the controlled pilot")
    approved = {item["id"]: item for item in catalogue["sources"] if item["approved"]}
    if "mimic-iv" in approved:
        raise RuntimeError("MIMIC-IV must remain disabled for the production pilot")

    plan = [
        ("synthea", "/synthea/load-hapi", {}),
        ("physionet-bidmc", "/sources/physionet-bidmc/ingest", {}),
        (
            "tcia-tcga-luad",
            "/sources/tcia/ingest",
            {
                "collection_doi": approved["tcia-tcga-luad"]["doi"],
                "license_id": "TCIA-DATA-USAGE-POLICY",
            },
        ),
    ]
    for source, endpoint, parameters in plan:
        directory = {
            "synthea": args.synthea_dir,
            "physionet-bidmc": args.bidmc_dir,
            "tcia-tcga-luad": args.tcia_dir,
        }[source]
        if not directory.exists():
            raise FileNotFoundError(f"approved source directory missing: {directory}")
        print(json.dumps({"source": source, "endpoint": endpoint, "parameters": parameters}))
        if args.execute:
            with httpx.Client(timeout=120) as client:
                response = client.post(
                    f"{args.api.rstrip('/')}{endpoint}",
                    params=parameters,
                    headers=auth_headers(),
                )
                response.raise_for_status()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
