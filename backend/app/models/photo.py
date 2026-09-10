"""models/photo.py — Photo attachment ORM model (proof-of-work uploads)."""

from datetime import datetime, timezone
from sqlalchemy import Integer, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Photo(Base):
    __tablename__ = "photos"

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    pin_id:      Mapped[int]      = mapped_column(Integer, ForeignKey("pins.id"),  nullable=False)
    uploader_id: Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    file_path:   Mapped[str]      = mapped_column(String(500), nullable=False)   # path in uploads/
    caption:     Mapped[str|None] = mapped_column(Text, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    pin      = relationship("Pin",  back_populates="photos")
    uploader = relationship("User", back_populates="photos")
