import json
import ssl
from collections import Counter
from collections.abc import Iterable
from typing import Protocol

import structlog
from aiokafka import AIOKafkaProducer

from app.config import Settings
from app.models.envelope import ClinicalEnvelope
from app.services.ledger import EventLedger, NullLedger
from app.services.retry import with_retry

log = structlog.get_logger()


class EventSink(Protocol):
    async def start(self) -> None: ...
    async def stop(self) -> None: ...
    async def send(self, topic: str, envelope: ClinicalEnvelope) -> None: ...


class KafkaSink:
    def __init__(self, settings: Settings) -> None:
        context = None
        if settings.kafka_security_protocol in {"SSL", "SASL_SSL"}:
            context = ssl.create_default_context(cafile=settings.kafka_ssl_cafile)
            if settings.kafka_ssl_certfile and settings.kafka_ssl_keyfile:
                context.load_cert_chain(settings.kafka_ssl_certfile, settings.kafka_ssl_keyfile)
        self._producer = AIOKafkaProducer(
            bootstrap_servers=settings.kafka_bootstrap_servers,
            security_protocol=settings.kafka_security_protocol,
            ssl_context=context,
            enable_idempotence=True,
            acks="all",
            compression_type="gzip",
            value_serializer=lambda value: json.dumps(
                value, separators=(",", ":"), default=str
            ).encode(),
        )

    async def start(self) -> None:
        await self._producer.start()

    async def stop(self) -> None:
        await self._producer.stop()

    async def send(self, topic: str, envelope: ClinicalEnvelope) -> None:
        partition_key = (
            f"{envelope.tenant_id}:"
            f"{envelope.patient_token or envelope.device_id or envelope.source_id}"
        )
        await self._producer.send_and_wait(
            topic,
            key=partition_key.encode(),
            value=envelope.model_dump(mode="json"),
            headers=[("schema-version", envelope.schema_version.encode())],
        )


class MemorySink:
    def __init__(self) -> None:
        self.events: list[tuple[str, ClinicalEnvelope]] = []

    async def start(self) -> None: ...
    async def stop(self) -> None: ...

    async def send(self, topic: str, envelope: ClinicalEnvelope) -> None:
        self.events.append((topic, envelope))


class EventRouter:
    TOPICS = {
        "fhir": "clinical.fhir.normalized.v1",
        "synthea": "clinical.synthetic.normalized.v1",
        "hl7v2": "clinical.hl7v2.normalized.v1",
        "dicom": "clinical.dicom.metadata.v1",
        "iomt": "clinical.iomt.telemetry.v1",
        "mimic": "clinical.icu.deidentified.v1",
    }

    def __init__(self, sink: EventSink, ledger: EventLedger | NullLedger | None = None) -> None:
        self._sink = sink
        self._ledger = ledger or NullLedger()

    async def route(self, envelope: ClinicalEnvelope) -> str:
        topic = self.TOPICS[envelope.source.value]
        if not await self._ledger.reserve(envelope):
            log.info(
                "duplicate_event_skipped",
                tenant_id=envelope.tenant_id,
                source=envelope.source.value,
                source_id=envelope.source_id,
            )
            return topic
        await with_retry(lambda: self._sink.send(topic, envelope))
        await self._ledger.mark_routed(envelope, topic)
        log.info(
            "event_routed",
            event_id=str(envelope.event_id),
            tenant_id=envelope.tenant_id,
            source=envelope.source.value,
            topic=topic,
            trace_id=envelope.trace_id,
        )
        return topic

    async def route_many(self, envelopes: Iterable[ClinicalEnvelope]) -> Counter[str]:
        counts: Counter[str] = Counter()
        for envelope in envelopes:
            counts[await self.route(envelope)] += 1
        return counts
