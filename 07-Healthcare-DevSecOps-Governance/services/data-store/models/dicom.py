from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from models.base import ClinicalRecordMixin


class DicomRecord(ClinicalRecordMixin, Base):
    __tablename__ = "dicom_records"

    study_uid: Mapped[str] = mapped_column(String(128), nullable=False)
    modality: Mapped[str] = mapped_column(String(32), nullable=False, default="OT")
    body_part: Mapped[str | None] = mapped_column(String(64))
    instance_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    quarantine_status: Mapped[str] = mapped_column(String(16), nullable=False, default="pending")
