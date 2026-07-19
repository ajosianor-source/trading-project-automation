from typing import Annotated

from auth import Principal, require_roles
from dependencies import DatabaseSession, NormalizerDependency, StoreDependency
from fastapi import APIRouter, Depends, Query
from schemas import Page, SourceSummary, StoreEnvelope, StoreResult

router = APIRouter(tags=["FHIR"])
Writer = Annotated[Principal, Depends(require_roles("ingestion:writer", "platform_admin"))]
Reader = Annotated[
    Principal,
    Depends(require_roles("clinical:reader", "security", "compliance", "platform_admin")),
]


@router.post("/store/fhir", response_model=StoreResult, status_code=201)
async def store_fhir(
    body: StoreEnvelope,
    identity: Writer,
    session: DatabaseSession,
    normalize: NormalizerDependency,
    store: StoreDependency,
) -> StoreResult:
    return await store.insert(
        session, "fhir", normalize.normalize("fhir", identity.tenant_id, body)
    )


@router.get("/v1/dashboard/fhir/summary", response_model=SourceSummary)
async def fhir_summary(identity: Reader, session: DatabaseSession, store: StoreDependency):
    return await store.summary(session, "fhir", identity.tenant_id)


@router.get("/v1/dashboard/fhir/patients", response_model=Page)
async def fhir_patients(
    identity: Reader,
    session: DatabaseSession,
    store: StoreDependency,
    search: str = Query(default="", max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
):
    items, total = await store.fhir_patients(session, identity.tenant_id, search, limit)
    return Page(items=items, total=total)
