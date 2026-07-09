from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

from stockforge_ml.ibkr import (
    IbkrConnectionConfig,
    IbkrConnectionError,
    IbkrDependencyError,
    diagnose,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only IBKR paper connection check.")
    parser.add_argument("--port", type=int, default=7497, choices=(7497, 4002))
    parser.add_argument("--client-id", type=int, default=41)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    config = IbkrConnectionConfig(port=args.port, client_id=args.client_id)
    try:
        result = diagnose(config)
    except (IbkrDependencyError, IbkrConnectionError) as error:
        print(f"NOT READY: {error}")
        return 2
    payload = json.dumps(asdict(result), indent=2)
    print(payload)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
