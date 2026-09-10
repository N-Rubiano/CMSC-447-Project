"""models/task.py — Punch task (checklist item) ORM model."""

from datetime import datetime, timezone
from sqlalchemy import Integer, DateTime, ForeignKey, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    project_id:  Mapped[int]      = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    pin_id:      Mapped[int|None] = mapped_column(Integer, ForeignKey("pins.id"),     nullable=True)
    title:       Mapped[str]      = mapped_column(String(255), nullable=False)
    description: Mapped[str|None] = mapped_column(Text, nullable=True)
    is_done:     Mapped[bool]     = mapped_column(Boolean, default=False)
    due_date:    Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at:  Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    project = relationship("Project", back_populates="tasks")
    pin     = relationship("Pin",     foreign_keys=[pin_id])
