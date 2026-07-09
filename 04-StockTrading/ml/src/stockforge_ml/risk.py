from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .contracts import ModelDecision, PositionPlan


@dataclass(frozen=True)
class RiskLimits:
    account_equity: float
    risk_per_trade: float = 0.005
    maximum_position_fraction: float = 0.10
    maximum_portfolio_exposure: float = 0.60
    maximum_open_positions: int = 8
    maximum_daily_loss: float = 0.02
    atr_stop_multiple: float = 2.0
    cvar_confidence: float = 0.95


def historical_cvar(returns: np.ndarray, confidence: float = 0.95) -> float:
    values = np.asarray(returns, dtype=float)
    values = values[np.isfinite(values)]
    if len(values) < 30:
        raise ValueError("At least 30 returns are required for CVaR.")
    cutoff = np.quantile(values, 1 - confidence)
    tail = values[values <= cutoff]
    return float(-tail.mean())


class PortfolioRiskEngine:
    def __init__(self, limits: RiskLimits) -> None:
        if limits.account_equity <= 0:
            raise ValueError("Account equity must be positive.")
        self.limits = limits

    def size(
        self,
        decision: ModelDecision,
        price: float,
        atr: float,
        current_exposure: float = 0.0,
        open_positions: int = 0,
        daily_pnl: float = 0.0,
    ) -> PositionPlan:
        reasons: list[str] = []
        if decision.status.value != "approved":
            reasons.append("model decision was not approved")
        if price <= 0 or atr <= 0:
            reasons.append("invalid price or ATR")
        if open_positions >= self.limits.maximum_open_positions:
            reasons.append("maximum open positions reached")
        if current_exposure >= self.limits.maximum_portfolio_exposure:
            reasons.append("portfolio exposure ceiling reached")
        if daily_pnl <= -self.limits.account_equity * self.limits.maximum_daily_loss:
            reasons.append("daily loss circuit breaker is active")

        stop_distance = atr * self.limits.atr_stop_multiple
        risk_budget = self.limits.account_equity * self.limits.risk_per_trade
        shares_by_risk = int(risk_budget // stop_distance) if stop_distance > 0 else 0
        position_cap = self.limits.account_equity * self.limits.maximum_position_fraction
        remaining_exposure = max(
            0.0,
            self.limits.account_equity
            * (self.limits.maximum_portfolio_exposure - current_exposure),
        )
        shares_by_cap = int(min(position_cap, remaining_exposure) // price) if price > 0 else 0
        shares = max(0, min(shares_by_risk, shares_by_cap))
        if shares < 1:
            reasons.append("risk limits permit fewer than one whole share")
        stop_price = price - decision.side * stop_distance
        approved = not reasons
        return PositionPlan(
            symbol=decision.symbol,
            side=decision.side,
            shares=shares if approved else 0,
            reference_price=price,
            stop_price=max(0.01, stop_price),
            risk_dollars=shares * stop_distance if approved else 0.0,
            notional=shares * price if approved else 0.0,
            approved=approved,
            reasons=tuple(reasons or ["all configured portfolio gates passed"]),
        )
