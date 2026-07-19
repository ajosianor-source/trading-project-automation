"""Standalone demo script to input sample data and see normalized outputs."""

import asyncio
import json
from pathlib import Path
from datetime import datetime, UTC

import structlog
from app.models.envelope import DataClassification, IngestionResult
from app.services.normalization import Normalizer
from app.services.routing import EventRouter, MemorySink
from app.services.ledger import NullLedger
from app.services.source_governance import SourceGovernance
from app.pipelines.synthea_ingest import SyntheaIngester
from app.pipelines.bidmc_ingest import BidmcIngester
from app.pipelines.dicom_ingest import DicomIngester
from app.pipelines.fhir_stream import FhirStreamer

# Configure structured logging to print clean JSON to the console
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(indent=2),
    ]
)
log = structlog.get_logger()

async def run_demo():
    print("=" * 80)
    print("STARTING HEALTHGOV DATA INGESTION DEMO")
    print("=" * 80)

    # 1. Initialize core services with in-memory components
    tokenization_secret = "local-staging-tokenization-key-change-me"
    normalizer = Normalizer(tokenization_secret)
    sink = MemorySink()
    router = EventRouter(sink, NullLedger())
    governance = SourceGovernance()

    tenant_id = "tenant-1"

    # -------------------------------------------------------------------------
    # DEMO 1: Synthea FHIR Bundle Ingestion (Synthetic -> Auto-Allowed)
    # -------------------------------------------------------------------------
    print("\n[DEMO 1] Ingesting Synthea FHIR Bundle...")
    sample_bundle = {
        "resourceType": "Bundle",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "patient-123",
                    "name": [{"family": "Smith", "given": ["John"]}],
                    "gender": "male",
                    "birthDate": "1980-01-01"
                }
            },
            {
                "resource": {
                    "resourceType": "Observation",
                    "id": "obs-456",
                    "status": "final",
                    "code": {
                        "coding": [{"system": "http://loinc.org", "code": "8867-4", "display": "Heart rate"}]
                    },
                    "subject": {"reference": "Patient/patient-123"},
                    "effectiveDateTime": "2026-07-18T12:00:00Z",
                    "valueQuantity": {"value": 72, "unit": "bpm"}
                }
            }
        ]
    }

    # Assess governance gate
    assessment = governance.assess("synthea")
    print(f"Governance Gate Decision: Allowed={assessment.allowed}")

    if assessment.allowed:
        # Normalize and route resources
        for entry in sample_bundle["entry"]:
            resource = entry["resource"]
            envelope = normalizer.fhir(tenant_id, resource, synthetic=True)
            await router.route(envelope)

        print(f"Successfully ingested {len(sample_bundle['entry'])} FHIR resources.")

    # -------------------------------------------------------------------------
    # DEMO 2: BIDMC Telemetry Ingestion (De-identified -> Allowed after License)
    # -------------------------------------------------------------------------
    print("\n[DEMO 2] Ingesting BIDMC Telemetry (PhysioNet)...")
    
    # First, try without license acceptance
    assessment_blocked = governance.assess("physionet-bidmc", license_accepted=False)
    print(f"Attempt 1 (License Pending): Allowed={assessment_blocked.allowed}, Reasons={assessment_blocked.reasons}")

    # Now, try with license acceptance
    assessment_allowed = governance.assess("physionet-bidmc", license_accepted=True)
    print(f"Attempt 2 (License Accepted): Allowed={assessment_allowed.allowed}")

    if assessment_allowed.allowed:
        sample_telemetry = {
            "device_id": "bidmc-monitor-001",
            "sequence": 42,
            "observed_at": "2026-07-18T12:05:00Z",
            "measurements": {
                "heart_rate": 75.0,
                "spo2": 98.0,
                "respiratory_rate": 16.0
            },
            "transport": "dataset-replay"
        }
        envelope = normalizer.public_iomt(tenant_id, sample_telemetry, "PhysioNet BIDMC v1.0.0")
        await router.route(envelope)
        print("Successfully ingested BIDMC telemetry reading.")

    # -------------------------------------------------------------------------
    # DEMO 3: TCIA DICOM Ingestion (De-identified -> Allowed after License + DOI)
    # -------------------------------------------------------------------------
    print("\n[DEMO 3] Ingesting TCIA DICOM Collection...")
    
    # Try without DOI
    assessment_no_doi = governance.assess("tcia", license_accepted=True, doi=None)
    print(f"Attempt 1 (Missing DOI): Allowed={assessment_no_doi.allowed}, Reasons={assessment_no_doi.reasons}")

    # Try with License + DOI
    assessment_tcia_allowed = governance.assess("tcia", license_accepted=True, doi="10.7937/K9/TCIA.2016.JGNIHEP5")
    print(f"Attempt 2 (License + DOI Recorded): Allowed={assessment_tcia_allowed.allowed}")

    if assessment_tcia_allowed.allowed:
        sample_dicom_metadata = {
            "SOPClassUID": "1.2.840.10008.5.1.4.1.1.2",
            "SOPInstanceUID": "1.3.6.1.4.1.14519.5.2.1.7014.4018.16382392",
            "PatientID": "TCGA-LUAD-01",
            "Modality": "CT",
            "StudyDate": "20260718",
            "StudyTime": "121000"
        }
        envelope = normalizer.dicom(tenant_id, sample_dicom_metadata, classification=DataClassification.public_deidentified)
        await router.route(envelope)
        print("Successfully ingested TCIA DICOM metadata.")

    # -------------------------------------------------------------------------
    # DEMO 4: MIMIC-IV Ingestion (Restricted -> Blocked by Default)
    # -------------------------------------------------------------------------
    print("\n[DEMO 4] Attempting to ingest MIMIC-IV Clinical Database...")
    
    # Try without DUA/Credentialing
    assessment_mimic = governance.assess("mimic-iv")
    print(f"Attempt 1 (No DUA): Allowed={assessment_mimic.allowed}, Reasons={assessment_mimic.reasons}")

    # Try with DUA/Credentialing
    assessment_mimic_allowed = governance.assess("mimic-iv", approval_reference="DUA:123,CREDENTIAL:456,GOVERNANCE:789")
    print(f"Attempt 2 (DUA + Credentialing Approved): Allowed={assessment_mimic_allowed.allowed}")

    if assessment_mimic_allowed.allowed:
        sample_mimic_row = {
            "subject_id": 10001,
            "hadm_id": 20001,
            "admittime": "2026-07-18T12:15:00Z",
            "charttime": "2026-07-18T12:20:00Z",
            "heart_rate": 82.0
        }
        envelope = normalizer.mimic(tenant_id, "patients", sample_mimic_row)
        await router.route(envelope)
        print("Successfully ingested MIMIC-IV clinical data.")

    # -------------------------------------------------------------------------
    # PRINT OUTPUTS (In-Memory Sink)
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("INGESTED DATA OUTPUTS (Clinical Envelopes in Memory Sink)")
    print("=" * 80)
    print(f"Total Envelopes Routed: {len(sink.events)}")
    
    for i, (topic, envelope) in enumerate(sink.events, 1):
        print(f"\n[{i}] Topic: {topic}")
        print(f"    Event ID: {envelope.event_id}")
        print(f"    Source: {envelope.source}")
        print(f"    Classification: {envelope.classification}")
        print(f"    Patient Token (HMAC Pseudonym): {envelope.patient_token}")
        print(f"    Payload Schema: {envelope.payload_schema}")
        print(f"    Payload: {json.dumps(envelope.payload)}")
        print(f"    Integrity SHA256: {envelope.integrity_sha256}")

if __name__ == "__main__":
    asyncio.run(run_demo())
