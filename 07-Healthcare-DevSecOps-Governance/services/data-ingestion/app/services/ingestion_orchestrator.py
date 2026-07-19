import asyncio
from pathlib import Path
from datetime import datetime
import structlog
from prometheus_client import REGISTRY, Counter, Gauge

from app.services.container import ServiceContainer
from app.models.envelope import IngestionResult

log = structlog.get_logger()

# Helper to get or create a metric safely to prevent duplicate registration in tests
def get_or_create_counter(name, documentation, labelnames):
    if name in REGISTRY._names_to_collectors:
        return REGISTRY._names_to_collectors[name]
    return Counter(name, documentation, labelnames)

def get_or_create_gauge(name, documentation, labelnames):
    if name in REGISTRY._names_to_collectors:
        return REGISTRY._names_to_collectors[name]
    return Gauge(name, documentation, labelnames)

# Prometheus Metrics for Ingestion Status
INGESTION_ATTEMPTS = get_or_create_counter("ingestion_attempts_total", "Total ingestion attempts", ["dataset_id", "status"])
INGESTION_VOLUME = get_or_create_counter("ingestion_volume_bytes", "Total volume of ingested data in bytes", ["dataset_id"])
GOVERNANCE_BLOCKED = get_or_create_counter("ingestion_governance_blocked_total", "Total ingestion attempts blocked by governance gates", ["dataset_id"])
DATASET_STATUS = get_or_create_gauge("dataset_ingestion_status", "Current status of dataset ingestion (1=active, 0=blocked)", ["dataset_id"])


class IngestionOrchestrator:
    def __init__(self, services: ServiceContainer) -> None:
        self.services = services
        self._runs: dict[str, asyncio.Task[dict[str, IngestionResult]]] = {}
        
        # In-memory Dataset Registry (simulating database/registry table)
        self.registry = {
            "synthea": {
                "dataset_name": "Synthea FHIR Bundles",
                "dataset_type": "synthetic",
                "license_required": False,
                "license_status": "accepted",
                "doi": None,
                "ingestion_mode": "scheduled",
                "governance_gate": "open",
            },
            "nhs-synthetic": {
                "dataset_name": "NHS Synthetic Data",
                "dataset_type": "synthetic",
                "license_required": False,
                "license_status": "accepted",
                "doi": None,
                "ingestion_mode": "scheduled",
                "governance_gate": "open",
            },
            "cms-synthetic": {
                "dataset_name": "CMS Synthetic Medicare Data",
                "dataset_type": "synthetic",
                "license_required": False,
                "license_status": "accepted",
                "doi": None,
                "ingestion_mode": "scheduled",
                "governance_gate": "open",
            },
            "physionet-bidmc": {
                "dataset_name": "BIDMC Telemetry (PhysioNet)",
                "dataset_type": "de-identified",
                "license_required": True,
                "license_status": "pending", # Must be accepted to ingest
                "doi": None,
                "ingestion_mode": "streaming",
                "governance_gate": "open",
            },
            "tcia": {
                "dataset_name": "TCIA DICOM Collection",
                "dataset_type": "de-identified",
                "license_required": True,
                "license_status": "pending", # Must be accepted to ingest
                "doi": None, # Must be recorded to ingest
                "ingestion_mode": "scheduled",
                "governance_gate": "open",
            },
            "hapi-fhir": {
                "dataset_name": "HAPI FHIR Public Server",
                "dataset_type": "synthetic",
                "license_required": False,
                "license_status": "accepted",
                "doi": None,
                "ingestion_mode": "streaming",
                "governance_gate": "open",
            },
            "mimic-iv": {
                "dataset_name": "MIMIC-IV Clinical Database",
                "dataset_type": "restricted",
                "license_required": True,
                "license_status": "pending",
                "doi": None,
                "ingestion_mode": "manual-only",
                "governance_gate": "blocked", # Strictly blocked until DUA approved
            }
        }

    def start(self, run_id: str, tenant_id: str, pipelines: list[str]) -> None:
        if run_id in self._runs and not self._runs[run_id].done():
            raise ValueError("Run identifier already active")
        self._runs[run_id] = asyncio.create_task(
            self.run(tenant_id, pipelines),
            name=f"ingestion-{run_id}",
        )

    async def run(self, tenant_id: str, pipelines: list[str]) -> dict[str, IngestionResult]:
        output: dict[str, IngestionResult] = {}
        
        for dataset_id in pipelines:
            # 1. Check if dataset exists in registry
            if dataset_id not in self.registry:
                log.error("ingestion_failed_unknown_dataset", dataset_id=dataset_id)
                output[dataset_id] = IngestionResult(rejected=1, errors=[f"Unknown dataset: {dataset_id}"])
                continue

            meta = self.registry[dataset_id]
            
            # 2. Enforce OPA Policy: "dataset.ingestion.allowed == true"
            # Enforce strict governance gates
            if meta["governance_gate"] == "blocked" or dataset_id == "mimic-iv":
                GOVERNANCE_BLOCKED.labels(dataset_id=dataset_id).inc()
                DATASET_STATUS.labels(dataset_id=dataset_id).set(0)
                
                # Log audit event to SIEM (Splunk/Wazuh)
                log.error(
                    "siem_audit_event_ingestion_blocked_by_governance_gate",
                    dataset_id=dataset_id,
                    dataset_type=meta["dataset_type"],
                    reason="DUA + credentialing required" if dataset_id == "mimic-iv" else "Governance gate blocked",
                    action="blocked",
                )
                # Notify security + clinical governance
                log.critical(
                    "security_alert_unauthorized_ingestion_attempt",
                    dataset_id=dataset_id,
                    severity="critical",
                )
                output[dataset_id] = IngestionResult(
                    rejected=1, 
                    errors=[f"Ingestion blocked by governance gate: {dataset_id} (DUA + credentialing required)"]
                )
                continue

            # 3. Check license status for de-identified datasets
            if meta["dataset_type"] == "de-identified" and meta["license_status"] != "accepted":
                log.error("ingestion_blocked_license_pending", dataset_id=dataset_id)
                output[dataset_id] = IngestionResult(rejected=1, errors=[f"License acceptance pending for {dataset_id}"])
                continue

            # 4. Check DOI for TCIA
            if dataset_id == "tcia" and not meta["doi"]:
                log.error("ingestion_blocked_missing_doi", dataset_id=dataset_id)
                output[dataset_id] = IngestionResult(rejected=1, errors=["DOI must be recorded for TCIA"])
                continue

            # 5. Trigger Ingestion Pipeline
            INGESTION_ATTEMPTS.labels(dataset_id=dataset_id, status="started").inc()
            DATASET_STATUS.labels(dataset_id=dataset_id).set(1)
            
            try:
                log.info("ingestion_pipeline_started", dataset_id=dataset_id, mode=meta["ingestion_mode"])
                
                # Simulate pipeline execution
                if dataset_id == "synthea":
                    result = await self.services.synthea.ingest_directory(
                        tenant_id, Path(self.services.settings.synthea_output_dir)
                    )
                elif dataset_id == "physionet-bidmc":
                    result = await self.services.bidmc.ingest(tenant_id, {})
                elif dataset_id == "tcia":
                    result = await self.services.dicom.ingest_directory(
                        tenant_id, Path(self.services.settings.dicom_quarantine_dir)
                    )
                elif dataset_id == "hapi-fhir":
                    result = await self.services.fhir.stream_search(tenant_id, "Observation", limit=100)
                else:
                    # NHS / CMS Synthetic
                    result = IngestionResult(accepted=100, routed_topics={f"{dataset_id}.synthetic": 100})

                INGESTION_ATTEMPTS.labels(dataset_id=dataset_id, status="success").inc()
                INGESTION_VOLUME.labels(dataset_id=dataset_id).inc(result.accepted * 1024) # Simulate volume
                
                # Log audit event to SIEM
                log.info(
                    "siem_audit_event_ingestion_success",
                    dataset_id=dataset_id,
                    accepted=result.accepted,
                    rejected=result.rejected,
                    timestamp=datetime.utcnow().isoformat(),
                )
                output[dataset_id] = result
                
            except Exception as exc:
                log.exception("ingestion_pipeline_failed", dataset_id=dataset_id, error=type(exc).__name__)
                INGESTION_ATTEMPTS.labels(dataset_id=dataset_id, status="failed").inc()
                output[dataset_id] = IngestionResult(rejected=1, errors=[type(exc).__name__])

        return output

    def status(self, run_id: str) -> dict:
        task = self._runs.get(run_id)
        if task is None:
            return {"status": "not_found"}
        if not task.done():
            return {"status": "running"}
        if task.cancelled():
            return {"status": "cancelled"}
        error = task.exception()
        if error:
            return {"status": "failed", "error": type(error).__name__}
        return {
            "status": "completed",
            "results": {key: value.model_dump(mode="json") for key, value in task.result().items()},
        }

    async def stop(self) -> None:
        active = [task for task in self._runs.values() if not task.done()]
        for task in active:
            task.cancel()
        if active:
            await asyncio.gather(*active, return_exceptions=True)
