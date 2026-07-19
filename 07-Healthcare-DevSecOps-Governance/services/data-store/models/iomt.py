from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from models.base import JSON_TYPE, ClinicalRecordMixin


class IomtRecord(ClinicalRecordMixin, Base):
    __tablename__ = "iomt_records"

    sequence: Mapped[int] = mapped_column(BigInteger, nullable=False)
    measurements: Mapped[dict] = mapped_column(JSON_TYPE, nullable=False, default=dict)
    trust_status: Mapped[str] = mapped_column(String(16), nullable=False, default="review")
