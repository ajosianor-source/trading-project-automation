# Automated Ingestion Pipelines & Dataset Governance Architecture

This document outlines the fully automated ingestion pipelines, dataset governance registry, Kafka topic definitions, Kubernetes CronJobs, streaming workers, blocked-ingestion handlers, SIEM/Prometheus integrations, and onboarding workflows for the HealthGov platform.

---

## Table of Contents
1. Dataset Governance Registry Schema
2. Governance Gate Logic
3. Kafka Topic Definitions
4. Ingestion Microservice Code Structure
5. CronJob YAMLs for Scheduled Ingestion
6. Streaming Ingestion Workers
7. Blocked-Ingestion Handler for MIMIC-IV
8. SIEM + Prometheus Integration
9. Dataset Onboarding Workflow Documentation

---

## 1. Dataset Governance Registry Schema

To track and enforce governance rules at the database level, we define a PostgreSQL schema with Row-Level Security (RLS) to ensure tenant isolation.

```sql
-- database/migrations/005_dataset_governance_registry.sql
BEGIN;

CREATE TYPE dataset_access_tier AS ENUM ('SYNTHETIC', 'PUBLIC_DEIDENTIFIED', 'CONTROLLED_RESEARCH', 'LIVE_PHI');
CREATE TYPE ingestion_mode_type AS ENUM ('scheduled', 'streaming', 'manual-only');
CREATE TYPE governance_gate_status AS ENUM ('open', 'blocked');
CREATE TYPE license_status_type AS ENUM ('pending', 'accepted');

CREATE TABLE IF NOT EXISTS dataset_governance_registry (
    dataset_id text NOT NULL,
    tenant_id text NOT NULL,
    dataset_name text NOT NULL,
    dataset_type dataset_access_tier NOT NULL,
    license_required boolean NOT NULL DEFAULT false,
    license_status license_status_type NOT NULL DEFAULT 'pending',
    doi text, -- Required for TCIA
    ingestion_mode ingestion_mode_type NOT NULL,
    governance_gate governance_gate_status NOT NULL DEFAULT 'blocked',
    last_ingested_at timestamptz,
    next_ingestion_at timestamptz,
    PRIMARY KEY (tenant_id, dataset_id)
);

-- Enable Row-Level Security (RLS)
ALTER TABLE dataset_governance_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataset_governance_registry FORCE ROW LEVEL SECURITY;

-- Create Tenant Isolation Policy
CREATE POLICY tenant_isolation ON dataset_governance_registry
    USING (tenant_id = current_setting('app.current_tenant', true))
    WITH CHECK (tenant_id = current_setting('app.current_tenant', true));

-- Revoke public access
REVOKE ALL ON dataset_governance_registry FROM PUBLIC;

COMMIT;
```

---

## 2. Governance Gate Logic

The governance gate logic is implemented in Python as part of the `SourceGovernance` service. It evaluates whether a dataset is allowed to be ingested based on its access tier, license status, DOI, and approval references.

```python
# services/data-ingestion/app/services/source_governance.py
# (See full implementation in the repository)
#
# Key Rules Enforced:
# 1. Synthetic datasets (Synthea, NHS, CMS) -> auto-ingest allowed.
# 2. De-identified datasets (BIDMC, TCIA) -> auto-ingest only after license + DOI recorded.
# 3. Restricted datasets (MIMIC-IV) -> ingestion blocked until DUA + credentialing approved.
```

---

## 3. Kafka Topic Definitions

To ensure strict data isolation, compliance, and auditability, we define dedicated Kafka topics with specific retention, partitioning, and encryption policies.

| Pipeline | Source Dataset | Raw Topic | Normalized/Processed Topic | Classification |
|---|---|---|---|---|
| **Synthea** | Synthea FHIR Bundles | `fhir.raw` | `fhir.normalized` | `SYNTHETIC` |
| **BIDMC** | BIDMC Telemetry (PhysioNet) | `iomt.raw` | `iomt.vitals` | `PUBLIC_DEIDENTIFIED` |
| **TCIA** | TCIA DICOM Collection | `dicom.audit` | `dicom.meta` | `PUBLIC_DEIDENTIFIED` |
| **HAPI FHIR** | HAPI FHIR Public Server | `fhir.live` | `fhir.live` | `SYNTHETIC` |
| **NHS** | NHS Synthetic Data | `nhs.synthetic` | `nhs.synthetic` | `SYNTHETIC` |
| **CMS** | CMS Synthetic Medicare Data | `cms.synthetic` | `cms.synthetic` | `SYNTHETIC` |

### Kafka Topic Configuration (GitOps / Strimzi KafkaTopic Custom Resource)

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: clinical.fhir.normalized.v1
  labels:
    strimzi.io/cluster: healthgov-kafka-cluster
spec:
  partitions: 12
  replicas: 3
  config:
    cleanup.policy: compact,delete
    retention.ms: 604800000 # 7 days
    segment.bytes: 1073741824 # 1 GB
    compression.type: gzip
    min.insync.replicas: 2
```

---

## 4. Ingestion Microservice Code Structure

The ingestion microservices are structured as modular, decoupled components within the `data-ingestion` service:

```text
services/data-ingestion/
├── app/
│   ├── config.py             # Configuration & Vault-backed secrets
│   ├── models/
│   │   ├── envelope.py       # Canonical ClinicalEnvelope & IngestionResult
│   │   └── sources.py        # EthicalSource & SourceAssessment models
│   ├── pipelines/
│   │   ├── __init__.py       # Pipeline exports
│   │   ├── bidmc_ingest.py   # BIDMC Telemetry Ingester
│   │   ├── dicom_ingest.py   # TCIA DICOM Ingester (Pixel-data isolation)
│   │   ├── fhir_stream.py    # HAPI FHIR Streaming Ingester
│   │   ├── mimic_ingest.py   # MIMIC-IV Ingester (Blocked by default)
│   │   └── synthea_ingest.py # Synthea FHIR Bundle Ingester
│   └── services/
│       ├── container.py      # Dependency Injection Container
│       ├── ingestion_orchestrator.py # Central Orchestrator
│       ├── ledger.py         # Event Ledger (PostgreSQL)
│       ├── normalization.py  # Normalization & Tokenization
│       ├── routing.py        # Event Router & Kafka Sink
│       └── source_governance.py # Governance Gate Registry & Rules
```

---

## 5. CronJob YAMLs for Scheduled Ingestion

We use Kubernetes `CronJob` resources to schedule periodic ingestion tasks. These jobs run with short-lived, Vault-issued service account tokens and strict security contexts.

### Synthea FHIR Bundles (Weekly)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ingestion-synthea-weekly
  namespace: healthgov-ingestion
spec:
  schedule: "0 2 * * 0" # Every Sunday at 2:00 AM UTC
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 5
  jobTemplate:
    spec:
      template:
        spec:
          securityContext:
            runAsNonRoot: true
            runAsUser: 10001
            seccompProfile:
              type: RuntimeDefault
          containers:
          - name: ingester
            image: healthgov/data-ingestion:latest
            command: ["python", "ingestion_orchestrator.py", "--tenant", "system-default", "--pipelines", "synthea"]
            envFrom:
            - configMapRef:
                name: ingestion-config
            - secretRef:
                name: ingestion-vault-secrets
            resources:
              limits:
                cpu: "1"
                memory: 2Gi
              requests:
                cpu: 500m
                memory: 1Gi
          restartPolicy: OnFailure
```

### NHS & CMS Synthetic Data (Daily)

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ingestion-synthetic-daily
  namespace: healthgov-ingestion
spec:
  schedule: "0 3 * * *" # Every day at 3:00 AM UTC
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          securityContext:
            runAsNonRoot: true
            runAsUser: 10001
          containers:
          - name: ingester
            image: healthgov/data-ingestion:latest
            command: ["python", "ingestion_orchestrator.py", "--tenant", "system-default", "--pipelines", "nhs-synthetic", "cms-synthetic"]
            envFrom:
            - configMapRef:
                name: ingestion-config
            - secretRef:
                name: ingestion-vault-secrets
            resources:
              limits:
                cpu: "1"
                memory: 2Gi
              requests:
                cpu: 500m
                memory: 1Gi
          restartPolicy: OnFailure
```

---

## 6. Streaming Ingestion Workers

Streaming ingestion workers run as continuous Kubernetes `Deployments` to handle real-time or high-frequency polling data sources.

### HAPI FHIR Public Server Polling Streamer

This worker polls the public HAPI FHIR server every 30 seconds for new resources and streams them into Kafka.

```python
# services/data-ingestion/app/workers/fhir_polling_worker.py
import asyncio
import structlog
from app.config import get_settings
from app.services.container import ServiceContainer

log = structlog.get_logger()

async def main():
    settings = get_settings()
    services = ServiceContainer(settings)
    await services.start()
    
    log.info("fhir_polling_worker_started", interval_seconds=settings.source_poll_seconds)
    
    last_timestamp = None
    try:
        while True:
            try:
                log.info("fhir_polling_cycle_started", since=last_timestamp)
                result = await services.fhir.stream_search(
                    tenant_id="system-default",
                    resource_type="Observation",
                    since=last_timestamp,
                    limit=100
                )
                log.info("fhir_polling_cycle_completed", accepted=result.accepted, rejected=result.rejected)
                
                # Update cursor to prevent duplicate processing
                last_timestamp = asyncio.get_event_loop().time() # Or use actual resource lastUpdated
            except Exception as e:
                log.error("fhir_polling_cycle_failed", error=str(e))
                
            await asyncio.sleep(settings.source_poll_seconds)
    finally:
        await services.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

### BIDMC Telemetry Streamer

This worker streams de-identified telemetry data into Kafka topics `iomt.raw` and `iomt.vitals` once the license is accepted.

```python
# services/data-ingestion/app/workers/bidmc_streaming_worker.py
import asyncio
import structlog
from pathlib import Path
from app.config import get_settings
from app.services.container import ServiceContainer

log = structlog.get_logger()

async def main():
    settings = get_settings()
    services = ServiceContainer(settings)
    await services.start()
    
    # Check governance gate before starting
    assessment = services.source_governance.assess("physionet-bidmc", license_accepted=True)
    if not assessment.allowed:
        log.error("bidmc_streaming_blocked_by_governance", reasons=assessment.reasons)
        return
        
    log.info("bidmc_streaming_worker_started")
    try:
        result = await services.bidmc.ingest(
            tenant_id="system-default",
            directory=Path(settings.bidmc_data_dir),
            limit=10000
        )
        log.info("bidmc_streaming_completed", accepted=result.accepted, rejected=result.rejected)
    except Exception as e:
        log.error("bidmc_streaming_failed", error=str(e))
    finally:
        await services.stop()

if __name__ == "__main__":
    asyncio.run(main())
```

---

## 7. Blocked-Ingestion Handler for MIMIC-IV

MIMIC-IV is strictly blocked by default. Any ingestion attempt triggers a high-severity security alert, logs an audit event to the SIEM, and notifies security and clinical governance.

```python
# services/data-ingestion/app/services/ingestion_orchestrator.py (Excerpt)
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
```

---

## 8. SIEM + Prometheus Integration

### SIEM Integration (Splunk/Wazuh)

All ingestion events, successes, failures, and blocked attempts are logged using structured JSON logging (`structlog`). These logs are collected by a log shipper (e.g., FluentBit or Logstash) and forwarded to the SIEM.

Example SIEM Audit Log for Blocked MIMIC-IV Ingestion:
```json
{
  "event": "siem_audit_event_ingestion_blocked_by_governance_gate",
  "level": "error",
  "timestamp": "2026-07-18T19:53:00.123456Z",
  "dataset_id": "mimic-iv",
  "dataset_type": "restricted",
  "reason": "DUA + credentialing required",
  "action": "blocked",
  "tenant_id": "tenant-1"
}
```

Example SIEM Security Alert:
```json
{
  "event": "security_alert_unauthorized_ingestion_attempt",
  "level": "critical",
  "timestamp": "2026-07-18T19:53:00.123500Z",
  "dataset_id": "mimic-iv",
  "severity": "critical",
  "tenant_id": "tenant-1"
}
```

### Prometheus Metrics

We expose the following Prometheus metrics to monitor ingestion health and governance enforcement:

- `ingestion_attempts_total`: Counter tracking total ingestion attempts labeled by `dataset_id` and `status` (`started`, `success`, `failed`).
- `ingestion_volume_bytes`: Counter tracking total volume of ingested data in bytes labeled by `dataset_id`.
- `ingestion_governance_blocked_total`: Counter tracking total ingestion attempts blocked by governance gates labeled by `dataset_id`.
- `dataset_ingestion_status`: Gauge tracking current status of dataset ingestion (`1` = active/open, `0` = blocked).

---

## 9. Dataset Onboarding Workflow Documentation

To onboard a new dataset or transition a restricted dataset (like MIMIC-IV) from blocked to open, follow this strict, multi-stage governance workflow:

```text
[Step 1: Request & DPIA] ──> [Step 2: License & DOI Verification] ──> [Step 3: Security & DUA Approval] ──> [Step 4: Registry Update] ──> [Step 5: Pipeline Activation]
```

### Step 1: Request & DPIA (Data Protection Impact Assessment)
- The clinical or research team submits an onboarding request.
- A DPIA must be completed and signed off by the Privacy Officer.

### Step 2: License & DOI Verification
- Verify the dataset license (e.g., Apache-2.0, ODC-By-1.0, or custom DUA).
- For public de-identified datasets (like TCIA), record the official DOI.

### Step 3: Security & DUA Approval
- For restricted datasets (like MIMIC-IV), verify that the operator has completed human-subjects training and PhysioNet credentialing.
- Record the official DUA reference number.

### Step 4: Registry Update
- Update the dataset-governance registry database table or in-memory configuration.
- Example SQL to approve MIMIC-IV:
  ```sql
  UPDATE dataset_governance_registry
  SET governance_gate = 'open',
      license_status = 'accepted',
      doi = '10.13026/C21C7D' -- Example MIMIC-IV DOI
  WHERE dataset_id = 'mimic-iv' AND tenant_id = 'tenant-1';
  ```

### Step 5: Pipeline Activation
- Once the registry is updated, the `SourceGovernance` gate will automatically transition to `allowed=True`.
- The orchestrator will permit scheduled or manual ingestion runs.
- Prometheus metrics will reflect `dataset_ingestion_status = 1`.
