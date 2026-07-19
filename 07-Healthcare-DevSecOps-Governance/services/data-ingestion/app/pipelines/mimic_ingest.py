import asyncio
from pathlib import Path
from typing import Any

import pandas as pd

from app.models.envelope import IngestionResult
from app.services.normalization import Normalizer
from app.services.routing import EventRouter

ALLOWED_TABLES = {
    "patients": "hosp/patients.csv.gz",
    "admissions": "hosp/admissions.csv.gz",
    "chartevents": "icu/chartevents.csv.gz",
    "icustays": "icu/icustays.csv.gz",
    "labevents": "hosp/labevents.csv.gz",
}


class MimicIngester:
    def __init__(self, normalizer: Normalizer, router: EventRouter, batch_size: int = 500) -> None:
        self.normalizer = normalizer
        self.router = router
        self.batch_size = batch_size

    async def ingest(
        self,
        tenant_id: str,
        dataset_dir: Path,
        tables: list[str],
        *,
        limit: int | None = None,
    ) -> IngestionResult:
        result = IngestionResult()
        remaining = limit
        for table in tables:
            relative = ALLOWED_TABLES.get(table)
            if relative is None:
                result.rejected += 1
                result.errors.append(f"Unsupported MIMIC table: {table}")
                continue
            path = (dataset_dir / relative).resolve()
            if dataset_dir.resolve() not in path.parents or not path.is_file():
                result.rejected += 1
                result.errors.append(f"Missing MIMIC table: {table}")
                continue
            iterator = pd.read_csv(path, chunksize=self.batch_size, low_memory=False)
            while True:
                chunk = await asyncio.to_thread(_next_chunk, iterator)
                if chunk is None:
                    break
                if remaining is not None:
                    chunk = chunk.head(remaining)
                rows = [_clean_row(row) for row in chunk.to_dict(orient="records")]
                counts = await self.router.route_many(
                    self.normalizer.mimic(tenant_id, table, row) for row in rows
                )
                result.accepted += len(rows)
                for topic, count in counts.items():
                    result.routed_topics[topic] = result.routed_topics.get(topic, 0) + count
                if remaining is not None:
                    remaining -= len(rows)
                    if remaining <= 0:
                        return result
        return result


def _clean_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        key: (None if pd.isna(value) else value.item() if hasattr(value, "item") else value)
        for key, value in row.items()
    }


def _next_chunk(iterator):
    return next(iterator, None)
