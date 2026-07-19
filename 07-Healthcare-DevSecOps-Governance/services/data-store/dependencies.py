from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_session
from services import Normalizer, StoreService

DatabaseSession = Annotated[AsyncSession, Depends(get_session)]


def normalizer(request: Request) -> Normalizer:
    return request.app.state.normalizer


def store_service(request: Request) -> StoreService:
    return request.app.state.store


NormalizerDependency = Annotated[Normalizer, Depends(normalizer)]
StoreDependency = Annotated[StoreService, Depends(store_service)]
