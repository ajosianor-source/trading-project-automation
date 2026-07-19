from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


RiskBand = Literal["low", "medium", "high"]
PolicyAction = Literal["allow", "warn", "blur_and_warn", "block"]
JobStatus = Literal["queued", "processing", "completed", "failed"]


class ProvenanceContext(BaseModel):
    has_c2pa: bool = False
    source_verified: bool = False
    signer: str | None = None


class MediaContext(BaseModel):
    page_url: str | None = None
    source_type: Literal["image", "video"] = "image"
    requested_policy: PolicyAction | None = None
    provenance: ProvenanceContext = Field(default_factory=ProvenanceContext)


class SignalScore(BaseModel):
    name: str
    score: float = Field(ge=0.0, le=1.0)
    detail: str


class AnalysisRegion(BaseModel):
    x: int
    y: int
    width: int
    height: int
    label: str


class AnalysisResult(BaseModel):
    status: Literal["success"] = "success"
    engine_mode: str
    verdict: str
    risk_band: RiskBand
    confidence: float = Field(ge=0.0, le=1.0)
    provenance: ProvenanceContext
    signals: list[SignalScore]
    regions: list[AnalysisRegion]
    policy_action: PolicyAction
    message: str


class VideoJobAccepted(BaseModel):
    status: Literal["accepted"] = "accepted"
    job_id: str
    poll_after_seconds: float
    message: str


class VideoJobState(BaseModel):
    status: JobStatus
    job_id: str
    submitted_at: str
    updated_at: str
    source_type: Literal["video"] = "video"
    result: AnalysisResult | None = None
    error: str | None = None
