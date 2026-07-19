import asyncio
import json
from pathlib import Path

import structlog

from app.models.envelope import IngestionResult
from app.services.normalization import Normalizer
from app.services.routing import EventRouter

log = structlog.get_logger()


class SyntheaIngester:
    def __init__(self, normalizer: Normalizer, router: EventRouter) -> None:
        self.normalizer = normalizer
        self.router = router

    async def ingest_directory(self, tenant_id: str, directory: Path) -> IngestionResult:
        result = IngestionResult()
        if not directory.is_dir():
            return IngestionResult(rejected=1, errors=["Synthea output directory does not exist"])
        for path in sorted(directory.glob("*.json")):
            try:
                bundle = await asyncio.to_thread(_read_json, path)
                resources = _bundle_resources(bundle)
                envelopes = [
                    self.normalizer.fhir(tenant_id, resource, synthetic=True)
                    for resource in resources
                ]
                counts = await self.router.route_many(envelopes)
                result.accepted += len(envelopes)
                result.routed_topics = dict(
                    {key: result.routed_topics.get(key, 0) + value for key, value in counts.items()}
                )
            except (OSError, ValueError, json.JSONDecodeError) as exc:
                log.warning("synthea_file_rejected", file=path.name, error=type(exc).__name__)
                result.rejected += 1
                if len(result.errors) < 20:
                    result.errors.append(f"{path.name}: {type(exc).__name__}")
        return result

    async def publish_directory(self, directory: Path, publish) -> IngestionResult:
        result = IngestionResult()
        if not directory.is_dir():
            return IngestionResult(rejected=1, errors=["Synthea output directory does not exist"])
        for path in sorted(directory.glob("*.json")):
            try:
                bundle = await asyncio.to_thread(_read_json, path)
                await publish(bundle)
                result.accepted += len(_bundle_resources(bundle))
            except (OSError, ValueError, json.JSONDecodeError) as exc:
                result.rejected += 1
                if len(result.errors) < 20:
                    result.errors.append(f"{path.name}: {type(exc).__name__}")
        return result


def _read_json(path: Path) -> dict:
    if path.stat().st_size > 100 * 1024 * 1024:
        raise ValueError("Synthea bundle exceeds maximum size")
    return json.loads(path.read_text(encoding="utf-8"))


def _bundle_resources(bundle: dict) -> list[dict]:
    if bundle.get("resourceType") == "Bundle":
        return [
            entry["resource"]
            for entry in bundle.get("entry", [])
            if isinstance(entry, dict) and isinstance(entry.get("resource"), dict)
        ]
    if bundle.get("resourceType"):
        return [bundle]
    raise ValueError("Expected a FHIR resource or Bundle")
