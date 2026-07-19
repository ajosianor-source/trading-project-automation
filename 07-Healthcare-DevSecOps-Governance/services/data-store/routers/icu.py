from typing import Annotated

from auth import Principal, require_roles
from dependencies import DatabaseSession, NormalizerDependency, StoreDependency
from fastapi import APIRouter, Depends, Query
from schemas import Page, SourceSummary, StoreEnvelope, StoreResult

router = APIRouter(tags=["ICU"])
Writer = Annotated[Principal, Depends(require_roles("ingestion:writer", "platform_admin"))]
Reader = Annotated[
    Principal, Depends(require_roles("clinical:reader", "security", "platform_admin"))
]


@router.post("/store/icu", response_model=StoreResult, status_code=201)
async def store_icu(
    body: StoreEnvelope,
    identity: Writer,
    session: DatabaseSession,
    normalize: NormalizerDependency,
    store: StoreDependency,
):
    return await store.insert(session, "icu", normalize.normalize("icu", identity.tenant_id, body))


@router.get("/v1/dashboard/icu/summary", response_model=SourceSummary)
async def icu_summary(identity: Reader, session: DatabaseSession, store: StoreDependency):
    return await store.summary(session, "icu", identity.tenant_id)


@router.get("/v1/dashboard/icu/vitals", response_model=Page)
async def icu_vitals(
    identity: Reader,
    session: DatabaseSession,
    store: StoreDependency,
    patient_token: str = Query(default="", max_length=64),
    limit: int = Query(default=200, ge=1, le=500),
):
    items, total = await store.icu_vitals(session, identity.tenant_id, patient_token, limit)
    return Page(items=items, total=total)
