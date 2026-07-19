from pathlib import Path

from app.config import Settings
from app.pipelines import (
    BidmcIngester,
    DicomIngester,
    FhirStreamer,
    Hl7Ingester,
    IomtSimulator,
    MimicIngester,
    SyntheaIngester,
)
from app.services.ledger import EventLedger, NullLedger
from app.services.normalization import Normalizer
from app.services.routing import EventRouter, EventSink, KafkaSink, MemorySink
from app.services.source_governance import SourceGovernance


class ServiceContainer:
    def __init__(
        self,
        settings: Settings,
        sink: EventSink | None = None,
        ledger: EventLedger | NullLedger | None = None,
    ) -> None:
        self.settings = settings
        self.sink = sink or (KafkaSink(settings) if settings.kafka_enabled else MemorySink())
        self.ledger = ledger or EventLedger(settings.database_url)
        self.normalizer = Normalizer(settings.tokenization_secret)
        self.router = EventRouter(self.sink, self.ledger)
        self.source_governance = SourceGovernance()
        self.synthea = SyntheaIngester(self.normalizer, self.router)
        self.fhir = FhirStreamer(
            self.normalizer,
            self.router,
            settings.hapi_fhir_base_url,
            settings.hapi_fhir_token,
        )
        self.hl7 = Hl7Ingester(self.normalizer, self.router)
        self.dicom = DicomIngester(
            self.normalizer,
            self.router,
            Path(settings.dicom_quarantine_dir),
            settings.max_upload_bytes,
        )
        self.iomt = IomtSimulator(self.normalizer, self.router, settings.tokenization_secret)
        self.mimic = MimicIngester(self.normalizer, self.router, settings.batch_size)
        self.bidmc = BidmcIngester(self.normalizer, self.router)

    async def start(self) -> None:
        await self.ledger.start()
        await self.sink.start()
        await self.iomt.start()

    async def stop(self) -> None:
        await self.iomt.stop()
        await self.sink.stop()
        await self.ledger.stop()

    async def ready(self) -> bool:
        return await self.ledger.ready()
