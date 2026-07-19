from typing import Annotated

from auth import Principal, require_roles
from dependencies import DatabaseSession, NormalizerDependency, StoreDependency
from fastapi import APIRouter, Depends, Query
from schemas import Page, SourceSummary, StoreEnvelope, StoreResult

router = APIRouter(tags=["HL7 v2"])
Writer = Annotated[Principal, Depends(require_roles("ingestion:writer", "platform_admin"))]
Reader = Annotated[Principal, Depends(require_roles("security", "compliance", "platform_admin"))]


@router.post("/store/hl7", response_model=StoreResult, status_code=201)
async def store_hl7(
    body: StoreEnvelope,
    identity: Writer,
    session: DatabaseSession,
    normalize: NormalizerDependency,
    store: StoreDependency,
):
    return await store.insert(session, "hl7", normalize.normalize("hl7", identity.tenant_id, body))


@router.get("/v1/dashboard/hl7/summary", response_model=SourceSummary)
async def hl7_summary(identity: Reader, session: DatabaseSession, store: StoreDependency):
    return await store.summary(session, "hl7", identity.tenant_id)


@router.get("/v1/dashboard/hl7/events", response_model=Page)
async def hl7_events(
    identity: Reader,
    session: DatabaseSession,
    store: StoreDependency,
    search: str = Query(default="", max_length=100),
    limit: int = Query(default=100, ge=1, le=500),
):
    items, total = await store.hl7_events(session, identity.tenant_id, search, limit)
    return Page(items=items, total=total)
