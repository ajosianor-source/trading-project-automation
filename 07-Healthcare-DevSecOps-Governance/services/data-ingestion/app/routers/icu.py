from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.auth import Principal, require_roles
from app.models.requests import MimicIngestRequest
from app.services.container import ServiceContainer
from app.services.dependencies import container

router = APIRouter(tags=["ICU datasets"])


@router.post("/icu/ingest", status_code=202)
async def ingest_icu(
    body: MimicIngestRequest,
    identity: Annotated[Principal, Depends(require_roles("data_engineer", "researcher"))],
    services: Annotated[ServiceContainer, Depends(container)],
):
    if body.tenant_id != identity.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant mismatch")
    try:
        services.source_governance.require(
            "mimic-iv", services.settings.mimic_approval_reference or None
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    configured = Path(services.settings.mimic_data_dir).resolve()
    requested = Path(body.dataset_path).resolve() if body.dataset_path else configured
    if requested != configured:
        raise HTTPException(status_code=403, detail="MIMIC path is not allowlisted")
    return await services.mimic.ingest(
        identity.tenant_id,
        configured,
        body.tables,
        limit=body.limit,
    )
