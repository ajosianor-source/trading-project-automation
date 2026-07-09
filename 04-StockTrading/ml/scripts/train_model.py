from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from stockforge_ml.features import engineer_features
from stockforge_ml.registry import save_bundle
from stockforge_ml.training import TrainingConfig, train_model_bundle


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train a candidate StockForge alpha/meta-label model."
    )
    parser.add_argument("--bars", type=Path, required=True, help="Point-in-time OHLCV CSV.")
    parser.add_argument("--output", type=Path, default=Path("artifacts/candidates"))
    parser.add_argument("--benchmark", default="SPY")
    parser.add_argument("--horizon", type=int, default=5)
    parser.add_argument("--minimum-return", type=float, default=0.005)
    parser.add_argument("--round-trip-cost", type=float, default=0.001)
    parser.add_argument("--folds", type=int, default=5)
    parser.add_argument("--embargo", type=int, default=5)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    bars = pd.read_csv(args.bars)
    features = engineer_features(bars, benchmark=args.benchmark)
    config = TrainingConfig(
        horizon=args.horizon,
        minimum_return=args.minimum_return,
        estimated_round_trip_cost=args.round_trip_cost,
        folds=args.folds,
        embargo_rows=args.embargo,
    )
    result = train_model_bundle(features, config)
    manifest = save_bundle(result.bundle, result.metrics, args.output)
    report = {
        "status": "candidate_only",
        "manifest": manifest.__dict__,
        "samples": result.samples,
        "alpha_out_of_fold_samples": result.out_of_fold_samples,
        "meta_out_of_fold_samples": result.meta_out_of_fold_samples,
        "fold_metrics": result.fold_metrics,
        "warning": "Training never promotes a model to paper or live execution.",
    }
    report_path = args.output / f"training-{manifest.version}.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
