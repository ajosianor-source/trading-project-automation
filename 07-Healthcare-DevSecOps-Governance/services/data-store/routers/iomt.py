from typing import Annotated

from auth import Principal, require_roles
from dependencies import DatabaseSession, NormalizerDependency, StoreDependency
from fastapi import APIRouter, Depends, Query
from schemas import Page, SourceSummary, StoreEnvelope, StoreResult

router = APIRouter(tags=["IoMT"])
Writer = Annotated[
    Principal, Depends(require_roles("ingestion:writer", "device_gateway", "platform_admin"))
]
Reader = Annotated[
    Principal, Depends(require_roles("security", "clinical:reader", "platform_admin"))
]


@router.post("/store/iomt", response_model=StoreResult, status_code=201)
async def store_iomt(
    body: StoreEnvelope,
    identity: Writer,
    session: DatabaseSession,
    normalize: NormalizerDependency,
    store: StoreDependency,
):
    return await store.insert(
        session, "iomt", normalize.normalize("iomt", identity.tenant_id, body)
    )


@router.get("/v1/dashboard/iomt/summary", response_model=SourceSummary)
async def iomt_summary(identity: Reader, session: DatabaseSession, store: StoreDependency):
    return await store.summary(session, "iomt", identity.tenant_id)


@router.get("/v1/dashboard/iomt/telemetry", response_model=Page)
async def iomt_telemetry(
    identity: Reader,
    session: DatabaseSession,
    store: StoreDependency,
    device_id: str = Query(default="", max_length=256),
    limit: int = Query(default=100, ge=1, le=500),
):
    items, total = await store.iomt_readings(session, identity.tenant_id, device_id, limit)
    return Page(items=items, total=total)
