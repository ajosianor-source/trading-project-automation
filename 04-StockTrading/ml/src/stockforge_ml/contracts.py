from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum
from typing import Mapping


class DecisionStatus(StrEnum):
    APPROVED = "approved"
    REJECTED = "rejected"
    HOLD = "hold"


@dataclass(frozen=True)
class ModelDecision:
    symbol: str
    timestamp: datetime
    status: DecisionStatus
    side: int
    alpha_probability: float
    meta_probability: float
    expected_return: float
    score: float
    reasons: tuple[str, ...]
    features: Mapping[str, float] = field(default_factory=dict, repr=False)
    model_version: str = "unversioned"

    def __post_init__(self) -> None:
        if self.timestamp.tzinfo is None:
            raise ValueError("Decision timestamps must be timezone-aware.")
        if self.side not in (-1, 0, 1):
            raise ValueError("side must be -1, 0, or 1.")
        for value in (self.alpha_probability, self.meta_probability):
            if not 0.0 <= value <= 1.0:
                raise ValueError("Probabilities must be in [0, 1].")


@dataclass(frozen=True)
class PositionPlan:
    symbol: str
    side: int
    shares: int
    reference_price: float
    stop_price: float
    risk_dollars: float
    notional: float
    approved: bool
    reasons: tuple[str, ...]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
