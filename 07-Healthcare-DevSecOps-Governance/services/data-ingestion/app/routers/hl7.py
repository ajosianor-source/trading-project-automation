from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from hl7apy.exceptions import HL7apyException

from app.auth import Principal, require_roles
from app.models.requests import Hl7IngestRequest
from app.services.container import ServiceContainer
from app.services.dependencies import container

router = APIRouter(tags=["HL7 v2"])


@router.post("/hl7/ingest")
async def ingest_hl7(
    body: Hl7IngestRequest,
    identity: Annotated[Principal, Depends(require_roles("integration", "clinical_system"))],
    services: Annotated[ServiceContainer, Depends(container)],
):
    if body.tenant_id != identity.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant mismatch")
    try:
        return await services.hl7.ingest(identity.tenant_id, body.message)
    except HL7apyException as exc:
        raise HTTPException(status_code=422, detail="Invalid HL7 v2 message") from exc
