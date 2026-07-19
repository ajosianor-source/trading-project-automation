import pytest

from app.services.ledger import NullLedger
from app.services.normalization import Normalizer
from app.services.routing import EventRouter, MemorySink


@pytest.mark.asyncio
async def test_iomt_routes_to_device_topic():
    sink = MemorySink()
    router = EventRouter(sink, NullLedger())
    envelope = Normalizer("x" * 32).iomt(
        "hospital-a",
        {
            "device_id": "device-0001",
            "sequence": 1,
            "observed_at": "2026-01-01T00:00:00Z",
            "measurements": {"heart_rate": 72},
        },
    )
    topic = await router.route(envelope)
    assert topic == "clinical.iomt.telemetry.v1"
    assert sink.events[0][1].device_id == "device-0001"
