from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.auth import Principal, require_roles
from app.models.requests import FhirIngestRequest
from app.services.container import ServiceContainer
from app.services.dependencies import container

router = APIRouter(tags=["FHIR and Synthea"])


@router.post("/fhir/ingest")
async def ingest_fhir(
    body: FhirIngestRequest,
    identity: Annotated[Principal, Depends(require_roles("integration", "data_engineer"))],
    services: Annotated[ServiceContainer, Depends(container)],
):
    if body.tenant_id != identity.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant mismatch")
    if body.bundle:
        return await services.fhir.ingest_bundle(identity.tenant_id, body.bundle)
    if body.resource_type:
        return await services.fhir.stream_search(
            identity.tenant_id, body.resource_type, limit=10_000
        )
    raise HTTPException(status_code=422, detail="bundle or resource_type is required")


@router.post("/synthea/ingest")
async def ingest_synthea(
    identity: Annotated[Principal, Depends(require_roles("data_engineer", "developer"))],
    services: Annotated[ServiceContainer, Depends(container)],
):
    return await services.synthea.ingest_directory(
        identity.tenant_id,
        Path(services.settings.synthea_output_dir),
    )


@router.post("/synthea/load-hapi")
async def load_synthea_into_private_hapi(
    _: Annotated[Principal, Depends(require_roles("data_engineer", "developer"))],
    services: Annotated[ServiceContainer, Depends(container)],
):
    services.source_governance.require("synthea")
    services.source_governance.require("private-hapi")
    return await services.synthea.publish_directory(
        Path(services.settings.synthea_output_dir),
        services.fhir.publish_bundle,
    )
