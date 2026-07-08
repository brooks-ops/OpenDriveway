from datetime import UTC, datetime
from math import ceil
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_db
from app.models.booking import Booking, BookingStatus
from app.models.listing import Listing, ListingStatus
from app.models.user import User
from app.schemas.booking import BookingCreate, BookingRead

router = APIRouter(prefix="/bookings", tags=["bookings"])


@router.post("", response_model=BookingRead, status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Booking:
    if payload.end_at <= payload.start_at:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "End time must be after start time")
    if payload.start_at.astimezone(UTC) <= datetime.now(UTC):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Start time must be in the future")

    listing = await db.get(Listing, payload.listing_id)
    if listing is None or listing.status != ListingStatus.active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    if listing.host_id == current_user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Hosts cannot book their own listing")

    overlapping_count = await db.scalar(
        select(func.count())
        .select_from(Booking)
        .where(
            Booking.listing_id == listing.id,
            Booking.status.in_([BookingStatus.pending_payment, BookingStatus.confirmed]),
            Booking.start_at < payload.end_at,
            Booking.end_at > payload.start_at,
        )
    )
    if (overlapping_count or 0) >= listing.capacity:
        raise HTTPException(status.HTTP_409_CONFLICT, "Listing is unavailable for the selected time")

    hours = max(1, ceil((payload.end_at - payload.start_at).total_seconds() / 3600))
    booking = Booking(
        listing_id=listing.id,
        driver_id=current_user.id,
        start_at=payload.start_at.astimezone(UTC),
        end_at=payload.end_at.astimezone(UTC),
        total_cents=hours * listing.price_cents,
        currency=listing.currency,
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)
    return booking


@router.get("/mine", response_model=list[BookingRead])
async def my_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Booking]:
    result = await db.scalars(select(Booking).where(Booking.driver_id == current_user.id).order_by(Booking.created_at.desc()))
    return list(result)


@router.get("/{booking_id}", response_model=BookingRead)
async def get_booking(
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Booking:
    booking = await db.get(Booking, booking_id)
    if booking is None or booking.driver_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    return booking
