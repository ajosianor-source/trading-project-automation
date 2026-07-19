import asyncio
import io
import json
import tempfile
from pathlib import Path

import pandas as pd
import pydicom
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid

from app.pipelines import (
    DicomIngester,
    FhirStreamer,
    Hl7Ingester,
    IomtSimulator,
    MimicIngester,
    SyntheaIngester,
)
from app.services.ledger import NullLedger
from app.services.normalization import Normalizer
from app.services.routing import EventRouter, MemorySink


def run_source_check(source: str) -> None:
    """Exercise a source end-to-end with generated data and no external systems."""
    asyncio.run(_run(source))


async def _run(source: str) -> None:
    sink = MemorySink()
    router = EventRouter(sink, NullLedger())
    normalizer = Normalizer("ci-only-tokenization-secret-value-32")
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        if source == "synthea":
            (root / "patient.json").write_text(
                json.dumps(
                    {
                        "resourceType": "Bundle",
                        "entry": [{"resource": {"resourceType": "Patient", "id": "synthetic-1"}}],
                    }
                ),
                encoding="utf-8",
            )
            result = await SyntheaIngester(normalizer, router).ingest_directory("ci-tenant", root)
        elif source == "fhir":
            result = await FhirStreamer(normalizer, router, "https://fhir.invalid/").ingest_bundle(
                "ci-tenant",
                {
                    "resourceType": "Bundle",
                    "entry": [{"resource": {"resourceType": "Observation", "id": "obs-1"}}],
                },
            )
        elif source == "hl7":
            result = await Hl7Ingester(normalizer, router).ingest(
                "ci-tenant",
                "MSH|^~\\&|EHR|HOSP|HG|PLATFORM|20260102120000||ADT^A01|MSG001|P|2.5\r"
                "PID|1||SYNTHETIC1^^^HOSP^MR\r",
            )
        elif source == "dicom":
            result = await DicomIngester(normalizer, router, root, 1_000_000).ingest_bytes(
                "ci-tenant", _dicom_fixture()
            )
        elif source == "iomt":
            result = await IomtSimulator(normalizer, router, "ci-signing-key").simulate(
                "ci-tenant", devices=1, events_per_device=1, interval_seconds=0
            )
        elif source == "mimic":
            hosp = root / "hosp"
            hosp.mkdir()
            pd.DataFrame([{"subject_id": 1, "anchor_year": 2024}]).to_csv(
                hosp / "patients.csv.gz", index=False, compression="gzip"
            )
            result = await MimicIngester(normalizer, router, 10).ingest(
                "ci-tenant", root, ["patients"]
            )
        else:
            raise ValueError(f"Unknown source: {source}")
    if result.accepted < 1 or not sink.events:
        raise RuntimeError(f"{source} check produced no routed events")


def _dicom_fixture() -> bytes:
    file_meta = FileMetaDataset()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    file_meta.MediaStorageSOPClassUID = generate_uid()
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    dataset = FileDataset(None, {}, file_meta=file_meta, preamble=b"\0" * 128)
    dataset.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
    dataset.PatientID = "SYNTHETIC1"
    dataset.Modality = "CT"
    buffer = io.BytesIO()
    pydicom.dcmwrite(buffer, dataset)
    return buffer.getvalue()
