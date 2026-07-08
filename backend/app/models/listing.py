import enum
import uuid
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Enum, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ListingStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    paused = "paused"
    archived = "archived"


class Listing(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "listings"
    __table_args__ = (
        CheckConstraint("price_cents >= 0", name="ck_listing_price_non_negative"),
        CheckConstraint("capacity >= 1", name="ck_listing_capacity_positive"),
        Index("ix_listings_city_state", "city", "state"),
    )

    host_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    address_line1: Mapped[str] = mapped_column(String(160), nullable=False)
    address_line2: Mapped[str | None] = mapped_column(String(120))
    city: Mapped[str] = mapped_column(String(90), nullable=False, index=True)
    state: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    country: Mapped[str] = mapped_column(String(2), default="US", nullable=False)
    latitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[Decimal] = mapped_column(Numeric(9, 6), nullable=False)
    price_cents: Mapped[int] = mapped_column(nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="usd", nullable=False)
    capacity: Mapped[int] = mapped_column(default=1, nullable=False)
    covered: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ev_charging: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[ListingStatus] = mapped_column(Enum(ListingStatus, name="listing_status"), default=ListingStatus.draft, nullable=False)

    host = relationship("User", back_populates="listings")
    bookings = relationship("Booking", back_populates="listing", cascade="all, delete-orphan")
