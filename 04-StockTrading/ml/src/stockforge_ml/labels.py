from __future__ import annotations

import numpy as np
import pandas as pd


def add_forward_labels(
    frame: pd.DataFrame,
    horizon: int = 5,
    minimum_return: float = 0.005,
    estimated_round_trip_cost: float = 0.001,
) -> pd.DataFrame:
    """Add side and tradability labels using only future data as targets."""
    if horizon < 1:
        raise ValueError("horizon must be positive.")
    labelled = frame.copy()
    future_close = labelled.groupby("symbol")["close"].shift(-horizon)
    labelled["forward_return"] = (future_close / labelled["close"]) - 1
    threshold = minimum_return + estimated_round_trip_cost
    labelled["alpha_target"] = np.where(
        labelled["forward_return"] > threshold,
        1,
        np.where(labelled["forward_return"] < -threshold, 0, np.nan),
    )
    return labelled


def make_meta_target(
    forward_return: pd.Series,
    predicted_side: np.ndarray,
    estimated_round_trip_cost: float,
) -> np.ndarray:
    signed_return = forward_return.to_numpy(dtype=float) * predicted_side
    return (signed_return > estimated_round_trip_cost).astype(int)
