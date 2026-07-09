from __future__ import annotations

import argparse
import json
from pathlib import Path

from stockforge_ml.ibkr import IbkrConnectionConfig, sync_paper_executions
from stockforge_ml.trading_history import build_trade_history


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Append IBKR paper executions and build trading history."
    )
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=7497)
    parser.add_argument("--client-id", type=int, default=43)
    parser.add_argument(
        "--executions", type=Path, default=Path("data/ibkr-executions.json")
    )
    parser.add_argument(
        "--output", type=Path, default=Path("data/trading-history.json")
    )
    args = parser.parse_args()
    result = sync_paper_executions(
        IbkrConnectionConfig(
            host=args.host,
            port=args.port,
            client_id=args.client_id,
            environment="paper",
        ),
        args.executions,
    )
    execution_payload = json.loads(args.executions.read_text(encoding="utf-8-sig"))
    history = build_trade_history(execution_payload.get("executions", []))
    history["accounts"] = execution_payload.get("accounts", [])
    history["journal"] = str(args.executions)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(history, indent=2), encoding="utf-8")
    print(json.dumps({**result, "closed_trades": len(history["closedTrades"])}, indent=2))


if __name__ == "__main__":
    main()
