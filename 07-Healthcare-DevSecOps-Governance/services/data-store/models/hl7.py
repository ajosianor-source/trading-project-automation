from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from models.base import ClinicalRecordMixin


class Hl7Record(ClinicalRecordMixin, Base):
    __tablename__ = "hl7_records"

    message_type: Mapped[str] = mapped_column(String(32), nullable=False)
    sending_application: Mapped[str | None] = mapped_column(String(128))
    facility: Mapped[str | None] = mapped_column(String(128))
    processing_status: Mapped[str] = mapped_column(String(16), nullable=False, default="accepted")
