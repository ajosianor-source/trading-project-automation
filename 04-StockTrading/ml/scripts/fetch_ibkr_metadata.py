from __future__ import annotations

import argparse
import json
from pathlib import Path

from stockforge_ml.ibkr import IbkrConnectionConfig, fetch_contract_metadata


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch full company names and stock metadata from IBKR."
    )
    parser.add_argument("--symbols", nargs="+", required=True)
    parser.add_argument("--port", type=int, default=7497, choices=(7497, 4002))
    parser.add_argument("--client-id", type=int, default=43)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/ibkr-instruments.json"),
    )
    args = parser.parse_args()
    result = fetch_contract_metadata(
        IbkrConnectionConfig(port=args.port, client_id=args.client_id),
        args.symbols,
        args.output,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
