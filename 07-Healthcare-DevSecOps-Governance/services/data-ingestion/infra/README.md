# Data Ingestion Terraform

This stack validates the local Healthcare Data Ingestion service and records non-secret references to
externally managed Railway and Vercel projects. It does not deploy Railway/Vercel resources or execute
live ingestion during `terraform apply`.

## Folder structure

```text
infra/
|-- main.tf
|-- variables.tf
|-- outputs.tf
|-- providers.tf
|-- terraform.tfvars.example
`-- modules/
    `-- ingestion/
        |-- main.tf
        |-- variables.tf
        `-- outputs.tf
```

## Run locally

Requirements:

- Terraform 1.8 or later.
- Python 3.11 or later.
- The ingestion virtual environment and dependencies installed.

From `services/data-ingestion`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -e ".[dev]"
cd infra
Copy-Item terraform.tfvars.example terraform.tfvars
terraform init
terraform fmt -check -recursive
terraform validate
terraform plan
terraform apply
terraform output
```

Windows uses `python_executable = ".venv\\Scripts\\python.exe"`. Linux/macOS should set
`python_executable = ".venv/bin/python"` in `terraform.tfvars`.

The local module hashes all ingestion Python files. Provisioners rerun only when code, the script path,
or external project metadata changes. They compile the application and verify the orchestrator CLI. They
do not connect to HAPI FHIR, MIMIC, DICOM, IoMT, PostgreSQL or Kafka.

To disable local provisioners:

```hcl
ingestion_enabled = false
```

## Railway integration

Railway remains an external resource because deployment credentials, runtime releases, PostgreSQL and
application secrets should not enter local Terraform state.

1. Create or select a Railway project.
2. Deploy `services/data-ingestion` using its `railway.toml` and `Dockerfile`.
3. Add Railway PostgreSQL and apply `sql/001_ingestion.sql` using a migration identity.
4. Configure `DATABASE_URL`, external Kafka mTLS settings, JWT issuer/audience/JWKS, HAPI endpoint and
   `TOKENIZATION_SECRET` as Railway secrets.
5. Attach an encrypted persistent volume only if DICOM quarantine is enabled.
6. Put the Railway project ID—not an API token—in `railway_project_id`.
7. Use Railway private networking or the HealthGov gateway for PHI endpoints.

Terraform treats `railway_project_id` as descriptive output and a local validation trigger only.
If an approved Railway Terraform provider is adopted later, pin its version, use short-lived CI
credentials, and migrate state to an encrypted remote backend before adding managed resources.

## Vercel integration

The Next.js dashboard is deployed independently from `portal/`.

1. Import the repository into Vercel and set the root directory to `portal`.
2. Configure the HealthGov API URL, OIDC issuer/client, and server-only auth BFF URL.
3. Keep backend tokens server-side; never prefix secrets with `NEXT_PUBLIC_`.
4. Configure CSP reporting, protected production branches and environment approvals.
5. Put the non-secret project ID in `vercel_project_id`.

The dashboard consumes tenant-scoped backend read APIs. It must never connect directly to Kafka,
Railway PostgreSQL or raw ingestion topics.

## Cloud expansion

### AWS

`main.tf` contains a commented EKS/RDS integration outline. For production, reuse the repository modules
under `infra/terraform/modules` and add:

- private subnets and VPC endpoints;
- private EKS control plane, workload identity and admission policies;
- encrypted Multi-AZ RDS PostgreSQL with deletion protection and tested backups;
- MSK or an approved Kafka service with TLS and tenant ACLs;
- KMS envelope encryption, Secrets Manager/Vault and immutable audit storage;
- WAF, service mesh, network policies, autoscaling and cross-region recovery.

### Azure

Use private AKS, Azure Database for PostgreSQL, Event Hubs Kafka endpoint, Key Vault, workload identity,
Private Link, Azure Policy and region-appropriate recovery.

### GCP

Use private GKE, Cloud SQL for PostgreSQL, an approved managed Kafka service, Cloud KMS, Secret Manager,
Workload Identity, VPC Service Controls and regional recovery.

For every provider, create a separate environment root and remote state. Do not place several production
clouds in one state file. Data residency, PHI scope, BAAs/DPAs, key ownership, retention and recovery
objectives require privacy, security and platform-owner approval.

## Outputs

- `ingestion_status`: `enabled-and-validated` or `disabled`.
- `ingestion_scripts_location`: absolute path used by the module.
- `external_deployment_metadata`: non-secret Railway and Vercel project references.
