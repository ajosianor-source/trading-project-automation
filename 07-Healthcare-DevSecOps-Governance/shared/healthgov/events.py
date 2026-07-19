import json
from datetime import UTC, datetime
from typing import Any

from aiokafka import AIOKafkaProducer

from healthgov.config import get_settings


class SecurityEventPublisher:
    """Kafka publisher with idempotence and acknowledgements for regulated evidence events."""

    def __init__(self) -> None:
        self._producer: AIOKafkaProducer | None = None

    async def start(self) -> None:
        settings = get_settings()
        self._producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            security_protocol=settings.kafka_security_protocol,
            enable_idempotence=True,
            acks="all",
            value_serializer=lambda value: json.dumps(value, separators=(",", ":")).encode(),
        )
        await self._producer.start()

    async def publish(self, topic: str, key: str, payload: dict[str, Any]) -> None:
        if self._producer is None:
            raise RuntimeError("Event publisher has not started")
        event = {
            "schema_version": "1.0",
            "occurred_at": datetime.now(UTC).isoformat(),
            **payload,
        }
        await self._producer.send_and_wait(topic, value=event, key=key.encode())

    async def stop(self) -> None:
        if self._producer is not None:
            await self._producer.stop()
