import asyncio
import json
import ssl
from typing import Any

import structlog
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from config import Settings
from schemas.common import StoreEnvelope
from sqlalchemy import text

from database import SessionFactory
from services.normalize import Normalizer
from services.store import StoreService

log = structlog.get_logger()

TOPIC_SOURCES = {
    "clinical.fhir.normalized.v1": "fhir",
    "clinical.synthetic.normalized.v1": "fhir",
    "clinical.hl7v2.normalized.v1": "hl7",
    "clinical.dicom.metadata.v1": "dicom",
    "clinical.iomt.telemetry.v1": "iomt",
    "clinical.icu.deidentified.v1": "icu",
}


class ClinicalConsumer:
    """At-least-once Kafka consumer with idempotent storage and a PHI-safe DLQ."""

    def __init__(self, settings: Settings, normalizer: Normalizer, store: StoreService) -> None:
        context = _ssl_context(settings)
        common = {
            "bootstrap_servers": settings.kafka_bootstrap_servers,
            "security_protocol": settings.kafka_security_protocol,
            "ssl_context": context,
        }
        self._consumer = AIOKafkaConsumer(
            *TOPIC_SOURCES,
            group_id=settings.kafka_consumer_group,
            enable_auto_commit=False,
            auto_offset_reset="earliest",
            value_deserializer=lambda value: json.loads(value),
            **common,
        )
        self._producer = AIOKafkaProducer(
            enable_idempotence=True,
            acks="all",
            value_serializer=lambda value: json.dumps(value, default=str).encode(),
            **common,
        )
        self._settings = settings
        self._normalizer = normalizer
        self._store = store
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        await self._producer.start()
        await self._consumer.start()
        self._task = asyncio.create_task(self._run(), name="clinical-store-consumer")

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            await asyncio.gather(self._task, return_exceptions=True)
        await self._consumer.stop()
        await self._producer.stop()

    async def _run(self) -> None:
        async for message in self._consumer:
            await self._handle(message)

    async def _handle(self, message: Any) -> None:
        source = TOPIC_SOURCES[message.topic]
        raw = message.value
        tenant_id = str(raw.get("tenant_id", ""))
        error: Exception | None = None
        for attempt in range(1, self._settings.kafka_max_attempts + 1):
            try:
                envelope = StoreEnvelope.model_validate(
                    {key: value for key, value in raw.items() if key in StoreEnvelope.model_fields}
                )
                if not __import__("re").fullmatch(r"[a-z0-9][a-z0-9-]{2,62}", tenant_id):
                    raise ValueError("invalid tenant identifier")
                async with SessionFactory() as session:
                    async with session.begin():
                        await session.execute(
                            text("SELECT set_config('app.current_tenant', :tenant, true)"),
                            {"tenant": tenant_id},
                        )
                        values = self._normalizer.normalize(source, tenant_id, envelope)
                        await self._store.insert(session, source, values)
                await self._consumer.commit()
                return
            except Exception as exc:
                error = exc
                await asyncio.sleep(min(2 ** (attempt - 1), 8))
        # DLQ deliberately excludes the clinical payload. Operators use event identifiers
        # and the retained Kafka source topic for an approved replay.
        await self._producer.send_and_wait(
            self._settings.kafka_dlq_topic,
            {
                "event_id": raw.get("event_id"),
                "tenant_id": tenant_id,
                "source_topic": message.topic,
                "partition": message.partition,
                "offset": message.offset,
                "error_type": type(error).__name__,
            },
        )
        await self._consumer.commit()
        log.error("clinical_event_dead_lettered", topic=message.topic, offset=message.offset)


def _ssl_context(settings: Settings):
    if settings.kafka_security_protocol not in {"SSL", "SASL_SSL"}:
        return None
    context = ssl.create_default_context(cafile=settings.kafka_ssl_cafile)
    if settings.kafka_ssl_certfile and settings.kafka_ssl_keyfile:
        context.load_cert_chain(settings.kafka_ssl_certfile, settings.kafka_ssl_keyfile)
    return context
