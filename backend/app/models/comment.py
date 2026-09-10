"""models/comment.py — Pin comment/audit-trail entry ORM model."""

from datetime import datetime, timezone
from sqlalchemy import Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id:         Mapped[int]      = mapped_column(Integer, primary_key=True, index=True)
    pin_id:     Mapped[int]      = mapped_column(Integer, ForeignKey("pins.id"), nullable=False)
    author_id:  Mapped[int]      = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    body:       Mapped[str]      = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    pin    = relationship("Pin",  back_populates="comments")
    author = relationship("User", back_populates="comments")
