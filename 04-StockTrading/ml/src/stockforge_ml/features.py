from __future__ import annotations

import numpy as np
import pandas as pd

REQUIRED_COLUMNS = {
    "timestamp",
    "symbol",
    "open",
    "high",
    "low",
    "close",
    "volume",
}

FEATURE_COLUMNS = [
    "log_return_1",
    "return_5",
    "return_21",
    "return_63",
    "volatility_20",
    "volatility_63",
    "downside_volatility_20",
    "sma_gap_20",
    "sma_gap_50",
    "sma_gap_200",
    "rsi_14",
    "atr_percent_14",
    "volume_z_20",
    "dollar_volume_20",
    "drawdown_63",
    "benchmark_return_21",
    "relative_strength_21",
]


def validate_bars(bars: pd.DataFrame) -> pd.DataFrame:
    missing = REQUIRED_COLUMNS.difference(bars.columns)
    if missing:
        raise ValueError(f"Missing required market-data columns: {sorted(missing)}")

    frame = bars.copy()
    frame["timestamp"] = pd.to_datetime(frame["timestamp"], utc=True)
    frame["symbol"] = frame["symbol"].astype(str).str.upper()
    frame = frame.sort_values(["symbol", "timestamp"]).drop_duplicates(
        ["symbol", "timestamp"], keep="last"
    )
    numeric = ["open", "high", "low", "close", "volume"]
    frame[numeric] = frame[numeric].apply(pd.to_numeric, errors="coerce")
    if frame[numeric].isna().any().any():
        raise ValueError("Market data contains non-numeric or missing OHLCV values.")
    if (frame[["open", "high", "low", "close"]] <= 0).any().any():
        raise ValueError("OHLC prices must be positive.")
    if (frame["volume"] < 0).any():
        raise ValueError("Volume cannot be negative.")
    if ((frame["high"] < frame[["open", "close", "low"]].max(axis=1)) |
            (frame["low"] > frame[["open", "close", "high"]].min(axis=1))).any():
        raise ValueError("OHLC relationships are invalid.")
    return frame


def _rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / period, adjust=False).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / period, adjust=False).mean()
    relative_strength = gain / loss.replace(0, np.nan)
    return (100 - (100 / (1 + relative_strength))).fillna(50.0)


def _per_symbol_features(group: pd.DataFrame) -> pd.DataFrame:
    result = group.copy()
    result["symbol"] = str(group.name)
    close = result["close"]
    log_return = np.log(close / close.shift(1))
    result["log_return_1"] = log_return
    for period in (5, 21, 63):
        result[f"return_{period}"] = close.pct_change(period)
    result["volatility_20"] = log_return.rolling(20).std() * np.sqrt(252)
    result["volatility_63"] = log_return.rolling(63).std() * np.sqrt(252)
    result["downside_volatility_20"] = (
        log_return.where(log_return < 0, 0).rolling(20).std() * np.sqrt(252)
    )
    for period in (20, 50, 200):
        moving_average = close.rolling(period).mean()
        result[f"sma_gap_{period}"] = (close / moving_average) - 1
    result["rsi_14"] = _rsi(close)

    previous_close = close.shift(1)
    true_range = pd.concat(
        [
            result["high"] - result["low"],
            (result["high"] - previous_close).abs(),
            (result["low"] - previous_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    result["atr_percent_14"] = true_range.rolling(14).mean() / close

    log_volume = np.log1p(result["volume"])
    volume_mean = log_volume.rolling(20).mean()
    volume_std = log_volume.rolling(20).std().replace(0, np.nan)
    result["volume_z_20"] = (log_volume - volume_mean) / volume_std
    result["dollar_volume_20"] = (close * result["volume"]).rolling(20).mean()
    rolling_peak = close.rolling(63).max()
    result["drawdown_63"] = (close / rolling_peak) - 1
    return result


def engineer_features(bars: pd.DataFrame, benchmark: str = "SPY") -> pd.DataFrame:
    """Create stationary, trailing-only features without backward filling."""
    frame = validate_bars(bars)
    featured = (
        frame.groupby("symbol", group_keys=False, sort=False)
        .apply(_per_symbol_features, include_groups=False)
        .reset_index(drop=True)
    )

    benchmark_symbol = benchmark.upper()
    benchmark_rows = featured.loc[
        featured["symbol"] == benchmark_symbol,
        ["timestamp", "return_21"],
    ].rename(columns={"return_21": "benchmark_return_21"})
    featured = featured.merge(benchmark_rows, on="timestamp", how="left")
    featured["relative_strength_21"] = (
        featured["return_21"] - featured["benchmark_return_21"]
    )
    return featured.sort_values(["timestamp", "symbol"]).reset_index(drop=True)
