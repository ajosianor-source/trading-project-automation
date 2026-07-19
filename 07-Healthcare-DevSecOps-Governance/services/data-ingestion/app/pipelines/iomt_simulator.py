import asyncio
import hashlib
import hmac
import random
from datetime import UTC, datetime

import structlog

from app.models.envelope import IngestionResult
from app.services.normalization import Normalizer
from app.services.routing import EventRouter

log = structlog.get_logger()


class IomtSimulator:
    """Produces safe MQTT/CoAP-shaped telemetry; it does not emulate clinical treatment."""

    def __init__(self, normalizer: Normalizer, router: EventRouter, signing_key: str) -> None:
        self.normalizer = normalizer
        self.router = router
        self._key = signing_key.encode()
        self._rng = random.SystemRandom()
        
        # Asynchronous queue for high-throughput telemetry buffering
        self._queue: asyncio.Queue[tuple[str, dict]] = asyncio.Queue(maxsize=10000)
        self._worker_task: asyncio.Task | None = None

    async def start(self) -> None:
        """Start the background worker pool to process queued telemetry."""
        self._worker_task = asyncio.create_task(self._worker_loop())
        log.info("iomt_ingestion_worker_started")

    async def stop(self) -> None:
        """Stop the background worker pool."""
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
            log.info("iomt_ingestion_worker_stopped")

    async def _worker_loop(self) -> None:
        """Background worker loop to process and route telemetry asynchronously."""
        while True:
            try:
                tenant_id, telemetry = await self._queue.get()
                try:
                    envelope = self.normalizer.iomt(tenant_id, telemetry)
                    await self.router.route(envelope)
                except Exception as exc:
                    log.exception(
                        "iomt_async_processing_failed",
                        tenant_id=tenant_id,
                        error=str(exc),
                    )
                finally:
                    self._queue.task_done()
            except asyncio.CancelledError:
                break
            except Exception as exc:
                log.error("iomt_worker_error", error=str(exc))
                await asyncio.sleep(1)

    async def ingest(self, tenant_id: str, telemetry: dict) -> IngestionResult:
        """Ingest telemetry asynchronously by pushing it to the queue."""
        try:
            # Push to queue without blocking (or block with timeout if queue is full)
            await asyncio.wait_for(self._queue.put((tenant_id, telemetry)), timeout=1.0)
            return IngestionResult(accepted=1, routed_topics={"queued": 1})
        except TimeoutError:
            log.error("iomt_ingestion_queue_full", tenant_id=tenant_id)
            return IngestionResult(rejected=1, errors=["Ingestion queue full"])

    async def simulate(
        self,
        tenant_id: str,
        *,
        devices: int = 5,
        events_per_device: int = 10,
        interval_seconds: float = 0.1,
        transport: str = "mqtt",
    ) -> IngestionResult:
        result = IngestionResult()
        for sequence in range(events_per_device):
            for index in range(devices):
                device_id = f"sim-device-{index:04d}"
                telemetry = {
                    "device_id": device_id,
                    "sequence": sequence,
                    "observed_at": datetime.now(UTC).isoformat(),
                    "transport": transport,
                    "measurements": {
                        "heart_rate": self._rng.randrange(55, 110),
                        "spo2": self._rng.randrange(92, 100),
                        "battery_percent": self._rng.randrange(30, 100),
                    },
                }
                telemetry["signature"] = hmac.new(
                    self._key,
                    repr(sorted(telemetry.items())).encode(),
                    hashlib.sha256,
                ).hexdigest()
                item = await self.ingest(tenant_id, telemetry)
                result.accepted += item.accepted
                for topic, count in item.routed_topics.items():
                    result.routed_topics[topic] = result.routed_topics.get(topic, 0) + count
            await asyncio.sleep(interval_seconds)
        return result
