"""
models/user.py — User ORM model.

Columns
-------
- id          : primary key
- email       : unique login identifier
- hashed_pw   : bcrypt hash
- full_name   : display name
- role        : one of the 6 canonical RBAC roles
- company_id  : FK to companies (nullable — admins/owners may have none)
- created_at  : UTC timestamp
- is_active   : soft-delete flag
"""

from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    email:       Mapped[str]      = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_pw:   Mapped[str]      = mapped_column(String(255), nullable=False)
    full_name:   Mapped[str]      = mapped_column(String(255), nullable=False)
    role:        Mapped[str]      = mapped_column(String(50), nullable=False)  # e.g. "admin"
    company_id:  Mapped[int|None] = mapped_column(Integer, ForeignKey("companies.id"), nullable=True)
    is_active:   Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at:  Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    company = relationship("Company", back_populates="members", foreign_keys=[company_id])
    pins_created  = relationship("Pin", back_populates="creator", foreign_keys="Pin.creator_id")
    pins_assigned = relationship("Pin", back_populates="assignee", foreign_keys="Pin.assignee_id")
    comments      = relationship("Comment", back_populates="author")
    photos        = relationship("Photo", back_populates="uploader")
