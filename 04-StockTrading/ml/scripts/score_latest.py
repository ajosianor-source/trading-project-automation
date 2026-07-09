from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from datetime import timedelta
from pathlib import Path

import pandas as pd

from stockforge_ml.decision import DecisionEngine, DecisionThresholds
from stockforge_ml.features import FEATURE_COLUMNS, engineer_features
from stockforge_ml.registry import load_bundle
from stockforge_ml.risk import PortfolioRiskEngine, RiskLimits


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Score the latest complete bar for each stock without routing orders."
    )
    parser.add_argument("--bars", type=Path, required=True)
    parser.add_argument("--artifact", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("artifacts/latest-decisions.json"))
    parser.add_argument("--benchmark", default="SPY")
    parser.add_argument("--account-equity", type=float, required=True)
    return parser.parse_args()


def serializable(value):
    if hasattr(value, "isoformat"):
        return value.isoformat()
    if hasattr(value, "value"):
        return value.value
    raise TypeError(f"Cannot serialize {type(value).__name__}")


def main() -> None:
    args = parse_args()
    bundle = load_bundle(args.artifact, args.manifest)
    bars = pd.read_csv(args.bars)
    features = engineer_features(bars, benchmark=args.benchmark).dropna(
        subset=FEATURE_COLUMNS
    )
    latest = (
        features.loc[features["symbol"] != args.benchmark.upper()]
        .sort_values("timestamp")
        .groupby("symbol", as_index=False)
        .tail(1)
    )
    decision_engine = DecisionEngine(
        bundle,
        DecisionThresholds(maximum_data_age=timedelta(days=5)),
    )
    risk_engine = PortfolioRiskEngine(RiskLimits(account_equity=args.account_equity))
    output = []
    for _, row in latest.iterrows():
        decision = decision_engine.decide(row)
        atr = float(row["atr_percent_14"] * row["close"])
        plan = risk_engine.size(decision, price=float(row["close"]), atr=atr)
        output.append({"decision": asdict(decision), "risk_plan": asdict(plan)})

    payload = {
        "model_version": bundle.version,
        "trained_through": bundle.trained_through,
        "execution_enabled": False,
        "results": output,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, indent=2, default=serializable),
        encoding="utf-8",
    )
    print(f"Wrote {len(output)} research decisions to {args.output}")


if __name__ == "__main__":
    main()
