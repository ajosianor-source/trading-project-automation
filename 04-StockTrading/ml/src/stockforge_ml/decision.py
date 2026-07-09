from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

import pandas as pd

from .contracts import DecisionStatus, ModelDecision, utc_now
from .models import ModelBundle


@dataclass(frozen=True)
class DecisionThresholds:
    alpha_probability: float = 0.56
    meta_probability: float = 0.60
    maximum_volatility: float = 0.65
    minimum_dollar_volume: float = 20_000_000
    maximum_data_age: timedelta = timedelta(days=5)
    allow_short: bool = False


class DecisionEngine:
    def __init__(
        self,
        bundle: ModelBundle,
        thresholds: DecisionThresholds = DecisionThresholds(),
    ) -> None:
        self.bundle = bundle
        self.thresholds = thresholds

    def decide(self, feature_row: pd.Series) -> ModelDecision:
        timestamp = pd.Timestamp(feature_row["timestamp"]).to_pydatetime()
        if timestamp.tzinfo is None:
            raise ValueError("Feature timestamps must be timezone-aware.")
        symbol = str(feature_row["symbol"]).upper()
        x = pd.DataFrame(
            [
                {
                    column: float(feature_row[column])
                    for column in self.bundle.feature_columns
                }
            ],
            columns=self.bundle.feature_columns,
        )
        alpha_probability = float(self.bundle.alpha_probability(x)[0])
        side = 1 if alpha_probability >= 0.5 else -1
        alpha_edge = abs(alpha_probability - 0.5) * 2
        meta_x = x.copy()
        meta_x["alpha_probability"] = alpha_probability
        meta_x["alpha_edge"] = alpha_edge
        meta_x = meta_x.loc[:, list(self.bundle.meta_feature_columns)]
        meta_probability = float(self.bundle.meta_probability(meta_x)[0])
        reasons: list[str] = []

        if utc_now() - timestamp > self.thresholds.maximum_data_age:
            reasons.append("stale market data")
        if float(feature_row["volatility_20"]) > self.thresholds.maximum_volatility:
            reasons.append("volatility above hard ceiling")
        if float(feature_row["dollar_volume_20"]) < self.thresholds.minimum_dollar_volume:
            reasons.append("liquidity below hard floor")
        if side < 0 and not self.thresholds.allow_short:
            reasons.append("short signals are disabled")
        if alpha_edge < (self.thresholds.alpha_probability - 0.5) * 2:
            reasons.append("alpha probability below threshold")
        if meta_probability < self.thresholds.meta_probability:
            reasons.append("meta-label probability below threshold")

        status = DecisionStatus.APPROVED if not reasons else DecisionStatus.REJECTED
        expected_return = side * alpha_edge * 0.02
        score = 100 * alpha_edge * meta_probability
        return ModelDecision(
            symbol=symbol,
            timestamp=timestamp,
            status=status,
            side=side,
            alpha_probability=alpha_probability,
            meta_probability=meta_probability,
            expected_return=expected_return,
            score=score,
            reasons=tuple(reasons or ["all configured inference gates passed"]),
            features={
                column: float(feature_row[column])
                for column in self.bundle.feature_columns
            },
            model_version=self.bundle.version,
        )
