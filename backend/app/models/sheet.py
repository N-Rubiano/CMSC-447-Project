"""models/sheet.py — Blueprint drawing sheet ORM model."""

from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Sheet(Base):
    __tablename__ = "sheets"

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    project_id:  Mapped[int]      = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    name:        Mapped[str]      = mapped_column(String(255), nullable=False)   # e.g. "Floor Plan – Level 1"
    version:     Mapped[str]      = mapped_column(String(50),  default="A")      # revision tag (A, B, 1.2 …)
    pdf_path:    Mapped[str|None] = mapped_column(String(500), nullable=True)    # relative path in uploads/
    description: Mapped[str|None] = mapped_column(Text, nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    project  = relationship("Project", back_populates="sheets")
    pins     = relationship("Pin",     back_populates="sheet",   cascade="all, delete-orphan")
    markups  = relationship("Markup",  back_populates="sheet",   cascade="all, delete-orphan")
