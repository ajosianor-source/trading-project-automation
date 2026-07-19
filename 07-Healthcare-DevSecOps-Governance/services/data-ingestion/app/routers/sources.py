from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import Principal, require_roles
from app.models.envelope import DataClassification
from app.models.sources import SourceAssessment
from app.services.container import ServiceContainer
from app.services.dependencies import container

router = APIRouter(prefix="/sources", tags=["Ethical data sources"])
APPROVED_TCIA_DOI = "10.7937/K9/TCIA.2016.JGNIHEP5"
APPROVED_TCIA_LICENSE = "TCIA-DATA-USAGE-POLICY"


@router.get("")
async def list_sources(
    _: Annotated[Principal, Depends(require_roles("data_engineer", "researcher", "auditor"))],
    services: Annotated[ServiceContainer, Depends(container)],
):
    return {"items": services.source_governance.list()}


@router.get("/{source_id}/assessment", response_model=SourceAssessment)
async def assess_source(
    source_id: str,
    _: Annotated[Principal, Depends(require_roles("data_engineer", "researcher", "auditor"))],
    services: Annotated[ServiceContainer, Depends(container)],
):
    try:
        return services.source_governance.assess(source_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown source") from exc


@router.post("/physionet-bidmc/ingest")
async def ingest_bidmc(
    identity: Annotated[Principal, Depends(require_roles("data_engineer", "researcher"))],
    services: Annotated[ServiceContainer, Depends(container)],
    limit: int = Query(default=5000, ge=1, le=100_000),
):
    services.source_governance.require("physionet-bidmc")
    return await services.bidmc.ingest(
        identity.tenant_id, Path(services.settings.bidmc_data_dir), limit
    )


@router.post("/tcia/ingest")
async def ingest_tcia(
    identity: Annotated[Principal, Depends(require_roles("data_engineer", "researcher"))],
    services: Annotated[ServiceContainer, Depends(container)],
    collection_doi: str = Query(min_length=8, max_length=200),
    license_id: str = Query(min_length=3, max_length=80),
):
    services.source_governance.require("tcia")
    if collection_doi != APPROVED_TCIA_DOI or license_id != APPROVED_TCIA_LICENSE:
        raise HTTPException(status_code=403, detail="TCIA collection is not approved for staging")
    return await services.dicom.ingest_directory(
        identity.tenant_id,
        Path(services.settings.tcia_data_dir),
        classification=DataClassification.public_deidentified,
        provenance={
            "dataset": "TCIA",
            "collection_doi": collection_doi,
            "license": license_id,
            "attribution_required": "true",
        },
    )


@router.post("/mimic-iv/enable")
async def assess_mimic(
    _: Annotated[Principal, Depends(require_roles("researcher", "privacy_officer"))],
    services: Annotated[ServiceContainer, Depends(container)],
):
    assessment = services.source_governance.assess(
        "mimic-iv", services.settings.mimic_approval_reference or None
    )
    if not assessment.allowed:
        raise HTTPException(status_code=403, detail=assessment.reasons)
    return assessment
