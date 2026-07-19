from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from models.base import ClinicalRecordMixin


class IcuRecord(ClinicalRecordMixin, Base):
    __tablename__ = "icu_records"

    stay_token: Mapped[str] = mapped_column(String(64), nullable=False)
    heart_rate: Mapped[float | None] = mapped_column(Float)
    spo2: Mapped[float | None] = mapped_column(Float)
    systolic_bp: Mapped[float | None] = mapped_column(Float)
    respiratory_rate: Mapped[float | None] = mapped_column(Float)
