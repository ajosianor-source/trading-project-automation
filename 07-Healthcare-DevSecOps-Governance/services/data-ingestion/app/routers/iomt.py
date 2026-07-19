from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.auth import Principal, require_roles
from app.models.requests import IomtTelemetryRequest
from app.services.container import ServiceContainer
from app.services.dependencies import container

router = APIRouter(tags=["IoMT"])


@router.post("/iomt/telemetry", status_code=202)
async def ingest_telemetry(
    body: IomtTelemetryRequest,
    identity: Annotated[Principal, Depends(require_roles("medical_device", "integration"))],
    services: Annotated[ServiceContainer, Depends(container)],
):
    if body.tenant_id != identity.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant mismatch")
    # Device signature and sequence replay checks belong at the mTLS IoMT gateway.
    return await services.iomt.ingest(identity.tenant_id, body.model_dump())
