from datetime import datetime

from pydantic import BaseModel


class FhirPatientView(BaseModel):
    token: str
    display: str
    gender: str | None = None
    birthYear: int | None = None
    lastUpdated: datetime
    resourceCount: int


class Hl7EventView(BaseModel):
    id: str
    occurredAt: datetime
    messageType: str
    sendingApplication: str
    facility: str
    status: str


class DicomStudyView(BaseModel):
    studyUid: str
    patientToken: str
    modality: str
    bodyPart: str | None = None
    studyDate: str | None = None
    instances: int
    quarantineStatus: str


class IomtReadingView(BaseModel):
    eventId: str
    deviceId: str
    observedAt: datetime
    sequence: int
    measurements: dict[str, float | str]
    trustStatus: str


class IcuVitalView(BaseModel):
    eventId: str
    patientToken: str
    stayToken: str
    observedAt: datetime
    heartRate: float | None = None
    spo2: float | None = None
    systolicBp: float | None = None
    respiratoryRate: float | None = None
