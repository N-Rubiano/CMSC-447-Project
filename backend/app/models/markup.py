"""models/markup.py — Vector annotation/markup ORM model for blueprint sheets."""

from datetime import datetime, timezone
from sqlalchemy import Integer, DateTime, ForeignKey, String, Text, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Markup(Base):
    __tablename__ = "markups"

    id:          Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    sheet_id:    Mapped[int]      = mapped_column(Integer, ForeignKey("sheets.id"),  nullable=False)
    author_id:   Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"),   nullable=False)

    # Type of annotation: "text" | "arrow" | "rectangle" | "freehand" | "callout"
    markup_type: Mapped[str]      = mapped_column(String(50), nullable=False)

    # JSON-encoded geometry (coordinates, dimensions, path data, etc.)
    geometry:    Mapped[str]      = mapped_column(Text, nullable=False)   # JSON string

    color:       Mapped[str]      = mapped_column(String(10),  default="#D97706")  # amber default
    label:       Mapped[str|None] = mapped_column(String(255), nullable=True)
    created_at:  Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    sheet  = relationship("Sheet", back_populates="markups")
    author = relationship("User",  foreign_keys=[author_id])
