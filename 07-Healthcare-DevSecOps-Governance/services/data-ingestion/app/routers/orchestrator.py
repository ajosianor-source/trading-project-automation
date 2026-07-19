from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request

from app.auth import Principal, require_roles
from app.models.requests import OrchestratorRequest
from app.services.ingestion_orchestrator import IngestionOrchestrator

router = APIRouter(prefix="/orchestrator", tags=["Orchestrator"])


def orchestrator(request: Request) -> IngestionOrchestrator:
    return request.app.state.orchestrator


@router.post("/runs", status_code=202)
async def start_run(
    body: OrchestratorRequest,
    identity: Annotated[Principal, Depends(require_roles("data_engineer", "platform_admin"))],
    service: Annotated[IngestionOrchestrator, Depends(orchestrator)],
):
    if body.tenant_id != identity.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant mismatch")
    run_id = uuid4().hex
    try:
        service.start(run_id, identity.tenant_id, body.pipelines)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"run_id": run_id, "status": "accepted"}


@router.get("/runs/{run_id}")
async def run_status(
    run_id: str,
    _: Annotated[Principal, Depends(require_roles("data_engineer", "platform_admin", "auditor"))],
    service: Annotated[IngestionOrchestrator, Depends(orchestrator)],
):
    return service.status(run_id)
