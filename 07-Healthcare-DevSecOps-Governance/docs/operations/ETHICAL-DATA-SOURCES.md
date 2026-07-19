# Ethical healthcare data-source operations

## Approved default topology

| Stream | Source | Classification | Control |
|---|---|---|---|
| FHIR R4 | Synthea via private HAPI FHIR | `SYNTHETIC` | No live PHI in test |
| HL7 v2 | Messages derived from synthetic patients | `SYNTHETIC` | Synthetic identifiers only |
| DICOM | Approved TCIA collection | `PUBLIC_DEIDENTIFIED` | DOI, license and attribution required |
| IoMT | PhysioNet BIDMC v1.0.0 | `PUBLIC_DEIDENTIFIED` | ODC-By attribution required |
| ICU | MIMIC-IV | `CONTROLLED_RESEARCH` | Disabled without credential and DUA approval |

The public HAPI test server is not a data source. The Compose topology runs a private,
pinned HAPI instance on `http://127.0.0.1:8090/fhir`.

## Preparing datasets

Place Synthea FHIR R4 JSON bundles under `data/synthea`. Place locally downloaded
BIDMC `*_Numerics.csv` files under `data/bidmc`. Place only an approved TCIA
collection under `data/tcia`; retain its DOI and license identifier for the ingest
request. Raw files are ignored by Git.

Do not place MIMIC-IV under `data/mimic` until the operator has completed required
human-subjects training, PhysioNet credentialing and the applicable DUA. Record the
internal approval in `MIMIC_APPROVAL_REFERENCE`. The API blocks MIMIC ingestion when
that value is absent.

## APIs

- `GET /sources` — source registry and access tiers.
- `GET /sources/{source_id}/assessment` — effective governance decision.
- `POST /synthea/load-hapi` — load local synthetic bundles into private HAPI.
- `POST /sources/physionet-bidmc/ingest?limit=5000` — BIDMC telemetry replay.
- `POST /sources/tcia/ingest?collection_doi=...&license_id=...` — TCIA metadata.
- `POST /sources/mimic-iv/enable` — verifies that controlled access is configured.

All calls require a verified tenant-scoped JWT. Provenance, classification, license
and attribution requirements travel with normalized envelopes. OPA policy
`healthgov.healthcare.data_source_governance` blocks unapproved source combinations.

## Prohibited actions

- Harvesting records from public FHIR test servers.
- Committing dataset files to source control.
- Re-identification or linkage intended to identify research participants.
- Sending MIMIC data to unapproved APIs or hosted CI runners.
- Using live PHI in shared development or demonstration environments.
