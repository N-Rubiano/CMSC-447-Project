"""models/project.py — Construction project ORM model."""

from datetime import datetime, timezone
from sqlalchemy import String, Integer, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Project(Base):
    __tablename__ = "projects"

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    name:        Mapped[str]      = mapped_column(String(255), nullable=False)
    address:     Mapped[str|None] = mapped_column(String(500), nullable=True)
    description: Mapped[str|None] = mapped_column(Text, nullable=True)
    status:      Mapped[str]      = mapped_column(String(50), default="active")  # active | archived
    created_at:  Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    sheets  = relationship("Sheet", back_populates="project", cascade="all, delete-orphan")
    pins    = relationship("Pin",   back_populates="project", cascade="all, delete-orphan")
    tasks   = relationship("Task",  back_populates="project", cascade="all, delete-orphan")
