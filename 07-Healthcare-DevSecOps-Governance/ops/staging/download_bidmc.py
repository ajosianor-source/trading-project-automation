"""Download BIDMC only after explicit license acceptance and write an audit receipt."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path

SOURCE_URL = "https://physionet.org/files/bidmc/1.0.0/"
LICENSE = "Open Data Commons Attribution License v1.0"
DOI = "10.13026/C2208R"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--destination", type=Path, required=True)
    parser.add_argument("--accept-license", action="store_true")
    args = parser.parse_args()
    if not args.accept_license:
        raise SystemExit("Explicit --accept-license is required")
    wget = shutil.which("wget")
    if not wget:
        raise RuntimeError("wget is required for the resumable verified source download")
    args.destination.mkdir(parents=True, exist_ok=True)
    subprocess.run(  # noqa: S603 - fixed executable and arguments; shell is never used.
        [
            wget, "--recursive", "--no-parent", "--continue", "--no-host-directories",
            "--cut-dirs=3", "--directory-prefix", str(args.destination),
            "--accept", "*.csv,LICENSE,README,SHA256SUMS.txt", SOURCE_URL,
        ],
        check=True,
    )
    receipt = {
        "source": "physionet-bidmc",
        "version": "1.0.0",
        "doi": DOI,
        "license": LICENSE,
        "source_url": SOURCE_URL,
        "accepted_at": datetime.now(UTC).isoformat(),
        "attribution_required": True,
    }
    (args.destination / "healthgov-source-receipt.json").write_text(
        json.dumps(receipt, indent=2) + "\n", encoding="utf-8"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
