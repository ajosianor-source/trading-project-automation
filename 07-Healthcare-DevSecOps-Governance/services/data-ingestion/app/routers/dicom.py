from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydicom.errors import InvalidDicomError

from app.auth import Principal, require_roles
from app.services.container import ServiceContainer
from app.services.dependencies import container

router = APIRouter(tags=["DICOM"])


@router.post("/dicom/ingest")
async def ingest_dicom(
    identity: Annotated[Principal, Depends(require_roles("radiology", "integration"))],
    services: Annotated[ServiceContainer, Depends(container)],
    file: Annotated[UploadFile, File(description="A single DICOM Part 10 object")],
):
    if file.content_type not in {"application/dicom", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="DICOM content type required")
    content = await file.read(services.settings.max_upload_bytes + 1)
    try:
        return await services.dicom.ingest_bytes(identity.tenant_id, content)
    except (ValueError, InvalidDicomError) as exc:
        raise HTTPException(status_code=422, detail="Invalid DICOM object") from exc
