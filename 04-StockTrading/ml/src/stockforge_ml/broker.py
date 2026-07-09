from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from .contracts import PositionPlan


@dataclass(frozen=True)
class PaperOrderIntent:
    symbol: str
    side: str
    quantity: int
    limit_price: float
    client_order_id: str


class PaperBroker(Protocol):
    def open_symbols(self) -> set[str]: ...

    def submit_limit(self, intent: PaperOrderIntent) -> str: ...


def build_paper_intent(
    plan: PositionPlan,
    limit_price: float,
    client_order_id: str,
    open_symbols: set[str],
) -> PaperOrderIntent:
    if not plan.approved:
        raise ValueError("Risk plan is not approved.")
    if plan.symbol in open_symbols:
        raise ValueError("Signal-spam gate: symbol already has an open position.")
    if limit_price <= 0:
        raise ValueError("Limit price must be positive.")
    deviation = abs(limit_price / plan.reference_price - 1)
    if deviation > 0.02:
        raise ValueError("Limit price deviates by more than 2% from the reference.")
    return PaperOrderIntent(
        symbol=plan.symbol,
        side="buy" if plan.side > 0 else "sell",
        quantity=plan.shares,
        limit_price=limit_price,
        client_order_id=client_order_id,
    )
