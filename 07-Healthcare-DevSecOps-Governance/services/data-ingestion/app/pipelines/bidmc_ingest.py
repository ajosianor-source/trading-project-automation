import asyncio
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pandas as pd

from app.models.envelope import IngestionResult
from app.services.normalization import Normalizer
from app.services.routing import EventRouter


class BidmcIngester:
    """Replay public BIDMC numerics as de-identified IoMT telemetry."""

    def __init__(self, normalizer: Normalizer, router: EventRouter) -> None:
        self.normalizer = normalizer
        self.router = router

    async def ingest(self, tenant_id: str, directory: Path, limit: int = 5000) -> IngestionResult:
        files = sorted(directory.rglob("*_Numerics.csv"))
        if not files:
            return IngestionResult(rejected=1, errors=["BIDMC numerics CSV files not found"])
        result = IngestionResult()
        remaining = limit
        for path in files:
            frame = await asyncio.to_thread(pd.read_csv, path)
            for index, row in frame.iterrows():
                if remaining <= 0:
                    return result
                measurements = _measurements(row)
                if not measurements:
                    result.rejected += 1
                    continue
                observed = datetime(2000, 1, 1, tzinfo=UTC) + timedelta(seconds=int(index))
                telemetry = {
                    "device_id": f"bidmc-monitor-{path.stem.split('_')[1]}",
                    "sequence": int(index),
                    "observed_at": observed.isoformat(),
                    "measurements": measurements,
                    "transport": "dataset-replay",
                }
                envelope = self.normalizer.public_iomt(
                    tenant_id, telemetry, "PhysioNet BIDMC v1.0.0"
                )
                topic = await self.router.route(envelope)
                result.routed_topics[topic] = result.routed_topics.get(topic, 0) + 1
                result.accepted += 1
                remaining -= 1
        return result


def _measurements(row) -> dict[str, float]:
    aliases = {
        "hr": ("hr", "heart_rate"),
        "spo2": ("spo2", "SpO2"),
        "respiratory_rate": ("rr", "respiratory_rate"),
        "pulse_rate": ("pr", "pulse_rate"),
    }
    values: dict[str, float] = {}
    lowered = {str(key).lower(): value for key, value in row.items()}
    for output, names in aliases.items():
        for name in names:
            value = lowered.get(name.lower())
            if value is not None and not pd.isna(value):
                values[output] = float(value)
                break
    return values
