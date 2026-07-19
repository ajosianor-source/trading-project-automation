import io
from pathlib import Path

import pandas as pd
import pydicom
import pytest
from pydicom.dataset import FileDataset, FileMetaDataset
from pydicom.uid import ExplicitVRLittleEndian, generate_uid

from app.pipelines.dicom_ingest import DicomIngester
from app.pipelines.fhir_stream import FhirStreamer
from app.pipelines.hl7_ingest import Hl7Ingester
from app.pipelines.mimic_ingest import MimicIngester
from app.services.ledger import NullLedger
from app.services.normalization import Normalizer
from app.services.routing import EventRouter, MemorySink


@pytest.fixture
def components():
    sink = MemorySink()
    router = EventRouter(sink, NullLedger())
    return Normalizer("test-secret-" * 4), router, sink


@pytest.mark.asyncio
async def test_fhir_bundle_routes_each_resource(components):
    normalizer, router, sink = components
    ingester = FhirStreamer(normalizer, router, "https://fhir.example/")
    result = await ingester.ingest_bundle(
        "hospital-a",
        {
            "resourceType": "Bundle",
            "entry": [
                {"resource": {"resourceType": "Patient", "id": "p1"}},
                {"resource": {"resourceType": "Observation", "id": "o1"}},
            ],
        },
    )
    assert result.accepted == 2
    assert len(sink.events) == 2


@pytest.mark.asyncio
async def test_hl7_extracts_minimum_required_metadata(components):
    normalizer, router, sink = components
    message = (
        "MSH|^~\\&|EHR|HOSP|HEALTHGOV|PLATFORM|20260102120000||ADT^A01|MSG001|P|2.5\r"
        "PID|1||PATIENT123^^^HOSP^MR||Example^Patient\r"
    )
    result = await Hl7Ingester(normalizer, router).ingest("hospital-a", message)
    assert result.accepted == 1
    envelope = sink.events[0][1]
    assert envelope.source_id == "MSG001"
    assert "Example" not in str(envelope.payload)


@pytest.mark.asyncio
async def test_dicom_reads_metadata_without_pixel_data(tmp_path: Path, components):
    normalizer, router, sink = components
    file_meta = FileMetaDataset()
    file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
    file_meta.MediaStorageSOPClassUID = generate_uid()
    file_meta.MediaStorageSOPInstanceUID = generate_uid()
    dataset = FileDataset(None, {}, file_meta=file_meta, preamble=b"\0" * 128)
    dataset.SOPInstanceUID = file_meta.MediaStorageSOPInstanceUID
    dataset.PatientID = "PATIENT123"
    dataset.Modality = "CT"
    dataset.StudyDate = "20260102"
    dataset.StudyTime = "120000"
    dataset.PixelData = b"\0" * 128
    buffer = io.BytesIO()
    pydicom.dcmwrite(buffer, dataset)
    result = await DicomIngester(normalizer, router, tmp_path, 1_000_000).ingest_bytes(
        "hospital-a", buffer.getvalue()
    )
    assert result.accepted == 1
    assert "PixelData" not in sink.events[0][1].payload
    assert list(tmp_path.glob("*.dcm"))


@pytest.mark.asyncio
async def test_mimic_reads_gzip_in_chunks(tmp_path: Path, components):
    normalizer, router, sink = components
    hosp = tmp_path / "hosp"
    hosp.mkdir()
    pd.DataFrame([{"subject_id": 1, "anchor_year": 2024}]).to_csv(
        hosp / "patients.csv.gz", index=False, compression="gzip"
    )
    result = await MimicIngester(normalizer, router, batch_size=1).ingest(
        "research-a", tmp_path, ["patients"]
    )
    assert result.accepted == 1
    assert sink.events[0][1].classification.value == "DEIDENTIFIED"
