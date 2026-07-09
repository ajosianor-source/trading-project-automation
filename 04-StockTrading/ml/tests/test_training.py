from stockforge_ml.decision import DecisionEngine
from stockforge_ml.features import FEATURE_COLUMNS
from stockforge_ml.features import engineer_features
from stockforge_ml.registry import load_bundle, save_bundle
from stockforge_ml.training import TrainingConfig, train_model_bundle

from test_pipeline import synthetic_bars


def test_walk_forward_training_produces_versioned_bundle(tmp_path):
    features = engineer_features(
        synthetic_bars(symbols=("SPY", "AAA", "BBB", "CCC"), periods=430)
    )
    result = train_model_bundle(
        features,
        TrainingConfig(folds=3, embargo_rows=5, random_state=42),
    )
    assert result.samples >= 500
    assert result.out_of_fold_samples >= 200
    assert result.meta_out_of_fold_samples >= 100
    assert result.bundle.version
    assert 0 <= result.metrics["alpha_oof_roc_auc"] <= 1
    assert 0 <= result.metrics["meta_roc_auc"] <= 1

    manifest = save_bundle(result.bundle, result.metrics, tmp_path)
    artifact = tmp_path / f"stockforge-{manifest.version}.skops"
    manifest_path = tmp_path / f"stockforge-{manifest.version}.json"
    loaded = load_bundle(artifact, manifest_path)
    assert loaded.version == result.bundle.version

    latest = (
        features.loc[features["symbol"] == "AAA"]
        .dropna(subset=FEATURE_COLUMNS)
        .sort_values("timestamp")
        .iloc[-1]
    )
    decision = DecisionEngine(loaded).decide(latest)
    assert decision.symbol == "AAA"
    assert 0 <= decision.alpha_probability <= 1
    assert 0 <= decision.meta_probability <= 1
