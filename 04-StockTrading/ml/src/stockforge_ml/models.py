from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline


def new_classifier(random_state: int) -> Pipeline:
    return Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median", add_indicator=True)),
            (
                "model",
                HistGradientBoostingClassifier(
                    learning_rate=0.04,
                    max_iter=250,
                    max_leaf_nodes=15,
                    min_samples_leaf=30,
                    l2_regularization=1.0,
                    early_stopping=True,
                    random_state=random_state,
                ),
            ),
        ]
    )


@dataclass
class ModelBundle:
    alpha_model: Pipeline
    meta_model: Pipeline
    feature_columns: tuple[str, ...]
    meta_feature_columns: tuple[str, ...]
    version: str
    trained_through: str
    estimated_round_trip_cost: float

    def alpha_probability(self, features: np.ndarray) -> np.ndarray:
        return self.alpha_model.predict_proba(features)[:, 1]

    def meta_probability(self, meta_features: np.ndarray) -> np.ndarray:
        return self.meta_model.predict_proba(meta_features)[:, 1]
