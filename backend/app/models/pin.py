"""
models/pin.py — Punch item (pin) ORM model.

Status lifecycle (enforced by permissions.validate_status_transition)
----------------------------------------------------------------------
  open → in_progress → contractor_review → admin_review → closed

Pin types
---------
  teardrop       — traditional CAD teardrop marker with numeric ID
  circle_stamp   — subcontractor-attributed circular badge with trade initials

Priority levels
---------------
  low | medium | high | critical
"""

from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Pin(Base):
    __tablename__ = "pins"

    id:                  Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    project_id:          Mapped[int]      = mapped_column(Integer, ForeignKey("projects.id"), nullable=False)
    sheet_id:            Mapped[int]      = mapped_column(Integer, ForeignKey("sheets.id"),   nullable=False)

    # Position on the blueprint canvas (percentage of sheet dimensions)
    x_pct:               Mapped[float]    = mapped_column(Float, nullable=False)   # 0.0 – 100.0
    y_pct:               Mapped[float]    = mapped_column(Float, nullable=False)

    pin_type:            Mapped[str]      = mapped_column(String(20),  default="teardrop")
    status:              Mapped[str]      = mapped_column(String(30),  default="open")
    priority:            Mapped[str]      = mapped_column(String(20),  default="medium")
    title:               Mapped[str]      = mapped_column(String(255), nullable=False)
    description:         Mapped[str|None] = mapped_column(Text, nullable=True)
    room_label:          Mapped[str|None] = mapped_column(String(100), nullable=True)

    # People
    creator_id:          Mapped[int|None] = mapped_column(Integer, ForeignKey("users.id"),     nullable=True)
    assignee_id:         Mapped[int|None] = mapped_column(Integer, ForeignKey("users.id"),     nullable=True)
    assigned_company_id: Mapped[int|None] = mapped_column(Integer, ForeignKey("companies.id"), nullable=True)

    # Timestamps
    created_at:          Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at:          Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    closed_at:           Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    project          = relationship("Project",  back_populates="pins")
    sheet            = relationship("Sheet",    back_populates="pins")
    creator          = relationship("User",     back_populates="pins_created",  foreign_keys=[creator_id])
    assignee         = relationship("User",     back_populates="pins_assigned", foreign_keys=[assignee_id])
    assigned_company = relationship("Company",  back_populates="pins",          foreign_keys=[assigned_company_id])
    comments         = relationship("Comment",  back_populates="pin",  cascade="all, delete-orphan")
    photos           = relationship("Photo",    back_populates="pin",  cascade="all, delete-orphan")
