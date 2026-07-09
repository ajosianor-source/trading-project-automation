from __future__ import annotations

import argparse
import json
from pathlib import Path

from stockforge_ml.ibkr import IbkrConnectionConfig, fetch_daily_bars


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch daily stock bars from an IBKR paper session; never routes orders."
    )
    parser.add_argument("--symbols", nargs="+", required=True)
    parser.add_argument("--port", type=int, default=7497, choices=(7497, 4002))
    parser.add_argument("--client-id", type=int, default=42)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/ibkr-daily-bars.csv"),
    )
    parser.add_argument("--duration", default="2 Y")
    args = parser.parse_args()
    result = fetch_daily_bars(
        IbkrConnectionConfig(port=args.port, client_id=args.client_id),
        args.symbols,
        args.output,
        duration=args.duration,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
