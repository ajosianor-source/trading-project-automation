from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from models.base import ClinicalRecordMixin


class FhirRecord(ClinicalRecordMixin, Base):
    __tablename__ = "fhir_records"

    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_version: Mapped[str | None] = mapped_column(String(64))
    display: Mapped[str | None] = mapped_column(String(256))
    birth_year: Mapped[int | None] = mapped_column(Integer)
    gender: Mapped[str | None] = mapped_column(String(32))
