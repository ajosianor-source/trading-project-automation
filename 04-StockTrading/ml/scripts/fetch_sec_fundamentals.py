from __future__ import annotations

import argparse
import json
import os
from datetime import date, datetime, timezone
from pathlib import Path

from stockforge_ml.sec import SecClient


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch point-in-time annual fundamentals from SEC EDGAR."
    )
    parser.add_argument("--symbols", nargs="+", required=True)
    parser.add_argument("--as-of", type=date.fromisoformat)
    parser.add_argument("--cache-dir", type=Path, default=Path("data/sec-cache"))
    parser.add_argument(
        "--output", type=Path, default=Path("data/sec-fundamentals.json")
    )
    args = parser.parse_args()
    user_agent = os.environ.get("SEC_USER_AGENT", "")
    client = SecClient(user_agent=user_agent, cache_dir=args.cache_dir)
    cutoff = args.as_of or datetime.now(timezone.utc).date()
    snapshots, errors = client.snapshots(
        list(dict.fromkeys(symbol.upper() for symbol in args.symbols)), cutoff
    )
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "asOf": cutoff.isoformat(),
        "source": "SEC EDGAR companyfacts",
        "pointInTime": True,
        "fundamentals": [snapshot.to_dict() for snapshot in snapshots],
        "errors": errors,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "source": payload["source"],
                "as_of": payload["asOf"],
                "snapshots": len(snapshots),
                "errors": len(errors),
                "output": str(args.output),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
