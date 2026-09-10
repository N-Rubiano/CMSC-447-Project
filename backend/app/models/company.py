"""models/company.py — Trade company / subcontractor company ORM model."""

from sqlalchemy import String, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Company(Base):
    __tablename__ = "companies"

    id:           Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name:         Mapped[str] = mapped_column(String(255), nullable=False)
    trade:        Mapped[str] = mapped_column(String(100), nullable=True)   # e.g. "Plumbing"
    initials:     Mapped[str] = mapped_column(String(4),   nullable=True)   # e.g. "MP"
    color_accent: Mapped[str] = mapped_column(String(10),  nullable=True)   # hex color for stamps

    members = relationship("User", back_populates="company", foreign_keys="User.company_id")
    pins    = relationship("Pin",  back_populates="assigned_company", foreign_keys="Pin.assigned_company_id")
