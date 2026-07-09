from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256

import numpy as np
import pandas as pd
from sklearn.metrics import (
    balanced_accuracy_score,
    brier_score_loss,
    log_loss,
    precision_score,
    roc_auc_score,
)
from sklearn.model_selection import TimeSeriesSplit

from .features import FEATURE_COLUMNS
from .labels import add_forward_labels, make_meta_target
from .models import ModelBundle, new_classifier


@dataclass(frozen=True)
class TrainingConfig:
    horizon: int = 5
    minimum_return: float = 0.005
    estimated_round_trip_cost: float = 0.001
    folds: int = 5
    embargo_rows: int = 5
    random_state: int = 20260703


@dataclass(frozen=True)
class TrainingResult:
    bundle: ModelBundle
    metrics: dict[str, float]
    fold_metrics: tuple[dict[str, float], ...]
    samples: int
    out_of_fold_samples: int
    meta_out_of_fold_samples: int


def _safe_auc(target: np.ndarray, probability: np.ndarray) -> float:
    return float(roc_auc_score(target, probability)) if len(np.unique(target)) == 2 else 0.5


def _metrics(target: np.ndarray, probability: np.ndarray) -> dict[str, float]:
    prediction = (probability >= 0.5).astype(int)
    return {
        "roc_auc": _safe_auc(target, probability),
        "log_loss": float(log_loss(target, probability, labels=[0, 1])),
        "brier": float(brier_score_loss(target, probability)),
        "balanced_accuracy": float(balanced_accuracy_score(target, prediction)),
        "precision": float(precision_score(target, prediction, zero_division=0)),
    }


def _chronological_splits(frame: pd.DataFrame, config: TrainingConfig):
    unique_times = np.array(sorted(frame["timestamp"].unique()))
    splitter = TimeSeriesSplit(
        n_splits=config.folds,
        gap=config.embargo_rows,
    )
    for train_time_index, test_time_index in splitter.split(unique_times):
        train_times = set(unique_times[train_time_index])
        test_times = set(unique_times[test_time_index])
        train_index = frame.index[frame["timestamp"].isin(train_times)].to_numpy()
        test_index = frame.index[frame["timestamp"].isin(test_times)].to_numpy()
        yield train_index, test_index


def train_model_bundle(
    featured_frame: pd.DataFrame,
    config: TrainingConfig = TrainingConfig(),
) -> TrainingResult:
    labelled = add_forward_labels(
        featured_frame,
        horizon=config.horizon,
        minimum_return=config.minimum_return,
        estimated_round_trip_cost=config.estimated_round_trip_cost,
    )
    usable = labelled.dropna(
        subset=[*FEATURE_COLUMNS, "alpha_target", "forward_return"]
    ).sort_values(["timestamp", "symbol"]).reset_index(drop=True)
    if len(usable) < 500:
        raise ValueError("At least 500 complete training rows are required.")
    if usable["alpha_target"].nunique() != 2:
        raise ValueError("Training data must contain both up and down classes.")

    x = usable[FEATURE_COLUMNS]
    y = usable["alpha_target"].astype(int).to_numpy()
    oof_alpha_probability = np.full(len(usable), np.nan)
    fold_metrics: list[dict[str, float]] = []

    for fold, (train_index, test_index) in enumerate(
        _chronological_splits(usable, config), start=1
    ):
        model = new_classifier(config.random_state + fold)
        model.fit(x.iloc[train_index], y[train_index])
        probability = model.predict_proba(x.iloc[test_index])[:, 1]
        oof_alpha_probability[test_index] = probability
        fold_result = _metrics(y[test_index], probability)
        fold_result["fold"] = float(fold)
        fold_metrics.append(fold_result)

    oof_mask = np.isfinite(oof_alpha_probability)
    if oof_mask.sum() < 200:
        raise ValueError("Insufficient out-of-fold predictions for meta-labeling.")
    oof_side = np.where(oof_alpha_probability[oof_mask] >= 0.5, 1, -1)
    meta_target = make_meta_target(
        usable.loc[oof_mask, "forward_return"],
        oof_side,
        config.estimated_round_trip_cost,
    )
    meta_frame = usable.loc[
        oof_mask, ["timestamp", "symbol", *FEATURE_COLUMNS]
    ].copy().reset_index(drop=True)
    meta_frame["alpha_probability"] = oof_alpha_probability[oof_mask]
    meta_frame["alpha_edge"] = np.abs(oof_alpha_probability[oof_mask] - 0.5) * 2
    meta_feature_columns = [*FEATURE_COLUMNS, "alpha_probability", "alpha_edge"]

    meta_oof_probability = np.full(len(meta_frame), np.nan)
    for fold, (train_index, test_index) in enumerate(
        _chronological_splits(meta_frame, config), start=1
    ):
        if len(np.unique(meta_target[train_index])) < 2:
            continue
        fold_meta_model = new_classifier(config.random_state + 100 + fold)
        fold_meta_model.fit(
            meta_frame.iloc[train_index][meta_feature_columns],
            meta_target[train_index],
        )
        meta_oof_probability[test_index] = fold_meta_model.predict_proba(
            meta_frame.iloc[test_index][meta_feature_columns]
        )[:, 1]
    meta_oof_mask = np.isfinite(meta_oof_probability)
    if meta_oof_mask.sum() < 100:
        raise ValueError("Insufficient out-of-fold meta-label predictions.")

    meta_model = new_classifier(config.random_state + 100)
    meta_model.fit(meta_frame[meta_feature_columns], meta_target)

    alpha_model = new_classifier(config.random_state)
    alpha_model.fit(x, y)
    trained_through = pd.Timestamp(usable["timestamp"].max()).isoformat()
    version_material = (
        f"{trained_through}|{len(usable)}|{config}|{','.join(FEATURE_COLUMNS)}"
    )
    version = datetime.now(timezone.utc).strftime("%Y%m%d") + "-" + sha256(
        version_material.encode()
    ).hexdigest()[:10]
    bundle = ModelBundle(
        alpha_model=alpha_model,
        meta_model=meta_model,
        feature_columns=tuple(FEATURE_COLUMNS),
        meta_feature_columns=tuple(meta_feature_columns),
        version=version,
        trained_through=trained_through,
        estimated_round_trip_cost=config.estimated_round_trip_cost,
    )
    metrics = {
        **{
            f"meta_{key}": value
            for key, value in _metrics(
                meta_target[meta_oof_mask],
                meta_oof_probability[meta_oof_mask],
            ).items()
        },
        "alpha_oof_roc_auc": _safe_auc(y[oof_mask], oof_alpha_probability[oof_mask]),
    }
    return TrainingResult(
        bundle=bundle,
        metrics=metrics,
        fold_metrics=tuple(fold_metrics),
        samples=len(usable),
        out_of_fold_samples=int(oof_mask.sum()),
        meta_out_of_fold_samples=int(meta_oof_mask.sum()),
    )
