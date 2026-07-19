from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class EventEnvelope(BaseModel):
    event_id: str
    tenant_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{2,62}$")
    event_type: str
    schema_version: str
    payload: dict[str, Any]


class Plugin(ABC):
    """Plugins receive minimized tenant-scoped events and return findings, never side effects."""

    @abstractmethod
    async def handle(self, event: EventEnvelope) -> list[dict[str, Any]]:
        raise NotImplementedError

