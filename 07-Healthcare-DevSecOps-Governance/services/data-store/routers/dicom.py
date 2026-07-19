from typing import Annotated

from auth import Principal, require_roles
from dependencies import DatabaseSession, NormalizerDependency, StoreDependency
from fastapi import APIRouter, Depends, Query
from schemas import Page, SourceSummary, StoreEnvelope, StoreResult

router = APIRouter(tags=["DICOM"])
Writer = Annotated[Principal, Depends(require_roles("ingestion:writer", "platform_admin"))]
Reader = Annotated[
    Principal, Depends(require_roles("clinical:reader", "security", "platform_admin"))
]


@router.post("/store/dicom", response_model=StoreResult, status_code=201)
async def store_dicom(
    body: StoreEnvelope,
    identity: Writer,
    session: DatabaseSession,
    normalize: NormalizerDependency,
    store: StoreDependency,
):
    return await store.insert(
        session, "dicom", normalize.normalize("dicom", identity.tenant_id, body)
    )


@router.get("/v1/dashboard/dicom/summary", response_model=SourceSummary)
async def dicom_summary(identity: Reader, session: DatabaseSession, store: StoreDependency):
    return await store.summary(session, "dicom", identity.tenant_id)


@router.get("/v1/dashboard/dicom/studies", response_model=Page)
async def dicom_studies(
    identity: Reader,
    session: DatabaseSession,
    store: StoreDependency,
    search: str = Query(default="", max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
):
    items, total = await store.dicom_studies(session, identity.tenant_id, search, limit)
    return Page(items=items, total=total)
