import asyncio
import io
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import pydicom

from app.models.envelope import DataClassification, IngestionResult
from app.services.normalization import Normalizer
from app.services.routing import EventRouter

METADATA_ALLOWLIST = {
    "SOPClassUID",
    "SOPInstanceUID",
    "StudyInstanceUID",
    "SeriesInstanceUID",
    "PatientID",
    "StudyDate",
    "StudyTime",
    "Modality",
    "BodyPartExamined",
    "Manufacturer",
    "ManufacturerModelName",
    "Rows",
    "Columns",
}


class DicomIngester:
    def __init__(
        self,
        normalizer: Normalizer,
        router: EventRouter,
        quarantine_dir: Path,
        max_bytes: int,
    ) -> None:
        self.normalizer = normalizer
        self.router = router
        self.quarantine_dir = quarantine_dir
        self.max_bytes = max_bytes

    async def ingest_bytes(
        self,
        tenant_id: str,
        content: bytes,
        *,
        classification: DataClassification = DataClassification.phi,
        provenance: dict[str, str] | None = None,
    ) -> IngestionResult:
        if not content or len(content) > self.max_bytes:
            raise ValueError("DICOM object is empty or exceeds upload limit")
        dataset = await asyncio.to_thread(
            pydicom.dcmread,
            io.BytesIO(content),
            stop_before_pixels=True,
            force=False,
        )
        metadata = _extract_metadata(dataset)
        envelope = self.normalizer.dicom(
            tenant_id, metadata, classification=classification, provenance=provenance
        )
        topic = await self.router.route(envelope)
        await asyncio.to_thread(self._quarantine, content, envelope.integrity_sha256)
        return IngestionResult(accepted=1, routed_topics={topic: 1})

    async def ingest_directory(
        self,
        tenant_id: str,
        directory: Path,
        *,
        classification: DataClassification = DataClassification.phi,
        provenance: dict[str, str] | None = None,
    ) -> IngestionResult:
        result = IngestionResult()
        if not directory.is_dir():
            return IngestionResult(rejected=1, errors=["DICOM directory does not exist"])
        for path in directory.rglob("*.dcm"):
            try:
                content = await asyncio.to_thread(path.read_bytes)
                item = await self.ingest_bytes(
                    tenant_id,
                    content,
                    classification=classification,
                    provenance=provenance,
                )
                result.accepted += item.accepted
                for topic, count in item.routed_topics.items():
                    result.routed_topics[topic] = result.routed_topics.get(topic, 0) + count
            except (OSError, ValueError, pydicom.errors.InvalidDicomError) as exc:
                result.rejected += 1
                if len(result.errors) < 20:
                    result.errors.append(f"{path.name}: {type(exc).__name__}")
        return result

    def _quarantine(self, content: bytes, digest: str) -> None:
        self.quarantine_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
        destination = (
            self.quarantine_dir / f"{datetime.now(UTC):%Y%m%d}-{uuid4().hex}-{digest[:12]}.dcm"
        )
        destination.write_bytes(content)


def _extract_metadata(dataset) -> dict[str, Any]:
    metadata: dict[str, Any] = {}
    for keyword in METADATA_ALLOWLIST:
        value = getattr(dataset, keyword, None)
        if value is not None:
            metadata[keyword] = _json_value(value)
    transfer_syntax = getattr(getattr(dataset, "file_meta", None), "TransferSyntaxUID", None)
    if transfer_syntax:
        metadata["TransferSyntaxUID"] = str(transfer_syntax)
    return metadata


def _json_value(value: Any) -> Any:
    if isinstance(value, str | int | float):
        return value
    if isinstance(value, list | tuple):
        return [_json_value(item) for item in value]
    return str(value)
