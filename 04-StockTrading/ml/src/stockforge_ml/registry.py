from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from hashlib import sha256
from pathlib import Path

import skops.io as sio

from .models import ModelBundle


@dataclass(frozen=True)
class ModelManifest:
    version: str
    trained_through: str
    artifact_sha256: str
    feature_columns: tuple[str, ...]
    estimated_round_trip_cost: float
    metrics: dict[str, float]


def save_bundle(
    bundle: ModelBundle,
    metrics: dict[str, float],
    destination: Path,
) -> ModelManifest:
    destination.mkdir(parents=True, exist_ok=True)
    artifact = destination / f"stockforge-{bundle.version}.skops"
    sio.dump(bundle, artifact)
    digest = sha256(artifact.read_bytes()).hexdigest()
    manifest = ModelManifest(
        version=bundle.version,
        trained_through=bundle.trained_through,
        artifact_sha256=digest,
        feature_columns=bundle.feature_columns,
        estimated_round_trip_cost=bundle.estimated_round_trip_cost,
        metrics=metrics,
    )
    manifest_path = destination / f"stockforge-{bundle.version}.json"
    manifest_path.write_text(json.dumps(asdict(manifest), indent=2), encoding="utf-8")
    return manifest


def load_bundle(artifact: Path, manifest_path: Path) -> ModelBundle:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    digest = sha256(artifact.read_bytes()).hexdigest()
    if digest != manifest["artifact_sha256"]:
        raise ValueError("Model artifact hash does not match its manifest.")
    unknown = set(sio.get_untrusted_types(file=artifact))
    allowed = {
        "stockforge_ml.models.ModelBundle",
        "numpy.dtype",
    }
    disallowed = unknown.difference(allowed)
    if disallowed:
        raise ValueError(f"Model contains unapproved types: {sorted(disallowed)}")
    bundle = sio.load(artifact, trusted=list(allowed))
    if not isinstance(bundle, ModelBundle):
        raise TypeError("Artifact did not contain a StockForge ModelBundle.")
    if bundle.version != manifest["version"]:
        raise ValueError("Model version does not match its manifest.")
    return bundle
