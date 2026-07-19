from enum import StrEnum

from pydantic import BaseModel, Field


class AccessTier(StrEnum):
    synthetic = "SYNTHETIC"
    public_deidentified = "PUBLIC_DEIDENTIFIED"
    controlled_research = "CONTROLLED_RESEARCH"
    live_phi = "LIVE_PHI"


class EthicalSource(BaseModel):
    source_id: str
    name: str
    modalities: list[str]
    access_tier: AccessTier
    license: str
    homepage: str
    attribution_required: bool = False
    reidentification_prohibited: bool = True
    credential_required: bool = False
    dua_required: bool = False
    enabled: bool = True
    approval_reference: str | None = None
    restrictions: list[str] = Field(default_factory=list)


class SourceAssessment(BaseModel):
    allowed: bool
    source: EthicalSource
    reasons: list[str] = Field(default_factory=list)
