from datetime import UTC, datetime, timedelta
from typing import Any, TypeVar

from models import DicomRecord, FhirRecord, Hl7Record, IcuRecord, IomtRecord
from schemas.common import SourceSummary, StoreResult, TrendPoint
from schemas.source import (
    DicomStudyView,
    FhirPatientView,
    Hl7EventView,
    IcuVitalView,
    IomtReadingView,
)
from sqlalchemy import desc, func, or_, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

Record = TypeVar("Record", FhirRecord, Hl7Record, DicomRecord, IomtRecord, IcuRecord)

MODELS = {
    "fhir": FhirRecord,
    "hl7": Hl7Record,
    "dicom": DicomRecord,
    "iomt": IomtRecord,
    "icu": IcuRecord,
}


class StoreService:
    async def insert(
        self, session: AsyncSession, source: str, values: dict[str, Any]
    ) -> StoreResult:
        model = MODELS[source]
        # The integrity-based unique key makes retries idempotent. We intentionally do not
        # overwrite clinical history when a producer replays an event.
        statement = (
            pg_insert(model).values(**values).on_conflict_do_nothing().returning(model.event_id)
        )
        event_id = (await session.execute(statement)).scalar_one_or_none()
        await session.flush()
        return StoreResult(
            event_id=event_id or values["event_id"],
            stored=event_id is not None,
            duplicate=event_id is None,
        )

    async def summary(self, session: AsyncSession, source: str, tenant_id: str) -> SourceSummary:
        model = MODELS[source]
        now = datetime.now(UTC)
        since = now - timedelta(hours=24)
        count, last_event = (
            await session.execute(
                select(func.count(model.id), func.max(model.observed_at)).where(
                    model.tenant_id == tenant_id, model.observed_at >= since
                )
            )
        ).one()
        buckets = (
            await session.execute(
                select(
                    func.date_trunc("hour", model.observed_at).label("bucket"),
                    func.count(model.id),
                )
                .where(model.tenant_id == tenant_id, model.observed_at >= since)
                .group_by("bucket")
                .order_by("bucket")
            )
        ).all()
        trend = [
            TrendPoint(time=bucket.isoformat(), accepted=accepted) for bucket, accepted in buckets
        ]
        age = (now - last_event).total_seconds() if last_event else None
        status = (
            "healthy"
            if age is not None and age < 300
            else "degraded"
            if age is not None and age < 3600
            else "offline"
        )
        return SourceSummary(
            accepted24h=count,
            rejected24h=0,
            eventsPerMinute=round(count / 1440, 2),
            lastEventAt=last_event,
            status=status,
            trend=trend,
        )

    async def fhir_patients(
        self, session: AsyncSession, tenant_id: str, search: str, limit: int
    ) -> tuple[list[FhirPatientView], int]:
        filters = [FhirRecord.tenant_id == tenant_id, FhirRecord.patient_token.is_not(None)]
        if search:
            pattern = f"%{_escape_like(search)}%"
            filters.append(
                or_(
                    FhirRecord.patient_token.ilike(pattern, escape="\\"),
                    FhirRecord.display.ilike(pattern, escape="\\"),
                )
            )
        rows = (
            await session.execute(
                select(
                    FhirRecord.patient_token,
                    func.max(FhirRecord.display),
                    func.max(FhirRecord.gender),
                    func.max(FhirRecord.birth_year),
                    func.max(FhirRecord.observed_at),
                    func.count(FhirRecord.id),
                )
                .where(*filters)
                .group_by(FhirRecord.patient_token)
                .order_by(desc(func.max(FhirRecord.observed_at)))
                .limit(limit)
            )
        ).all()
        total = (
            await session.execute(
                select(func.count(func.distinct(FhirRecord.patient_token))).where(*filters)
            )
        ).scalar_one()
        return [
            FhirPatientView(
                token=token,
                display=display or f"Patient {token[-6:]}",
                gender=gender,
                birthYear=birth_year,
                lastUpdated=updated,
                resourceCount=resource_count,
            )
            for token, display, gender, birth_year, updated, resource_count in rows
        ], total

    async def hl7_events(
        self, session: AsyncSession, tenant_id: str, search: str, limit: int
    ) -> tuple[list[Hl7EventView], int]:
        filters = [Hl7Record.tenant_id == tenant_id]
        if search:
            pattern = f"%{_escape_like(search)}%"
            filters.append(
                or_(
                    Hl7Record.message_type.ilike(pattern, escape="\\"),
                    Hl7Record.sending_application.ilike(pattern, escape="\\"),
                    Hl7Record.facility.ilike(pattern, escape="\\"),
                )
            )
        records = (
            await session.scalars(
                select(Hl7Record)
                .where(*filters)
                .order_by(Hl7Record.observed_at.desc())
                .limit(limit)
            )
        ).all()
        total = (await session.scalar(select(func.count(Hl7Record.id)).where(*filters))) or 0
        return [
            Hl7EventView(
                id=str(record.event_id),
                occurredAt=record.observed_at,
                messageType=record.message_type,
                sendingApplication=record.sending_application or "",
                facility=record.facility or "",
                status=record.processing_status,
            )
            for record in records
        ], total

    async def dicom_studies(
        self, session: AsyncSession, tenant_id: str, search: str, limit: int
    ) -> tuple[list[DicomStudyView], int]:
        filters = [DicomRecord.tenant_id == tenant_id]
        if search:
            pattern = f"%{_escape_like(search)}%"
            filters.append(
                or_(
                    DicomRecord.study_uid.ilike(pattern, escape="\\"),
                    DicomRecord.patient_token.ilike(pattern, escape="\\"),
                    DicomRecord.modality.ilike(pattern, escape="\\"),
                )
            )
        records = (
            await session.scalars(
                select(DicomRecord)
                .where(*filters)
                .order_by(DicomRecord.observed_at.desc())
                .limit(limit)
            )
        ).all()
        total = (await session.scalar(select(func.count(DicomRecord.id)).where(*filters))) or 0
        return [
            DicomStudyView(
                studyUid=r.study_uid,
                patientToken=r.patient_token or "unlinked",
                modality=r.modality,
                bodyPart=r.body_part,
                studyDate=r.observed_at.date().isoformat(),
                instances=r.instance_count,
                quarantineStatus=r.quarantine_status,
            )
            for r in records
        ], total

    async def iomt_readings(
        self, session: AsyncSession, tenant_id: str, device_id: str, limit: int
    ) -> tuple[list[IomtReadingView], int]:
        filters = [IomtRecord.tenant_id == tenant_id]
        if device_id:
            filters.append(IomtRecord.device_id == device_id)
        records = (
            await session.scalars(
                select(IomtRecord)
                .where(*filters)
                .order_by(IomtRecord.observed_at.desc())
                .limit(limit)
            )
        ).all()
        total = (await session.scalar(select(func.count(IomtRecord.id)).where(*filters))) or 0
        return [
            IomtReadingView(
                eventId=str(r.event_id),
                deviceId=r.device_id or "unknown",
                observedAt=r.observed_at,
                sequence=r.sequence,
                measurements=r.measurements,
                trustStatus=r.trust_status,
            )
            for r in records
        ], total

    async def icu_vitals(
        self, session: AsyncSession, tenant_id: str, patient_token: str, limit: int
    ) -> tuple[list[IcuVitalView], int]:
        filters = [IcuRecord.tenant_id == tenant_id]
        if patient_token:
            filters.append(IcuRecord.patient_token == patient_token)
        records = (
            await session.scalars(
                select(IcuRecord)
                .where(*filters)
                .order_by(IcuRecord.observed_at.desc())
                .limit(limit)
            )
        ).all()
        total = (await session.scalar(select(func.count(IcuRecord.id)).where(*filters))) or 0
        return [
            IcuVitalView(
                eventId=str(r.event_id),
                patientToken=r.patient_token or "unlinked",
                stayToken=r.stay_token,
                observedAt=r.observed_at,
                heartRate=r.heart_rate,
                spo2=r.spo2,
                systolicBp=r.systolic_bp,
                respiratoryRate=r.respiratory_rate,
            )
            for r in records
        ], total


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
