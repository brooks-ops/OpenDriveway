from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.booking import BookingStatus


class BookingCreate(BaseModel):
    listing_id: UUID
    start_at: datetime
    end_at: datetime


class BookingRead(BaseModel):
    id: UUID
    listing_id: UUID
    driver_id: UUID
    start_at: datetime
    end_at: datetime
    status: BookingStatus
    total_cents: int = Field(ge=0)
    currency: str
    created_at: datetime

    model_config = {"from_attributes": True}
