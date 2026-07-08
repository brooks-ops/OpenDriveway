from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.listing import ListingStatus


class ListingBase(BaseModel):
    title: str = Field(min_length=4, max_length=120)
    description: str = Field(min_length=20)
    address_line1: str = Field(min_length=4, max_length=160)
    address_line2: str | None = Field(default=None, max_length=120)
    city: str = Field(min_length=2, max_length=90)
    state: str = Field(min_length=2, max_length=40)
    postal_code: str = Field(min_length=3, max_length=20)
    country: str = Field(default="US", min_length=2, max_length=2)
    latitude: Decimal = Field(ge=-90, le=90)
    longitude: Decimal = Field(ge=-180, le=180)
    price_cents: int = Field(ge=0)
    currency: str = Field(default="usd", min_length=3, max_length=3)
    capacity: int = Field(default=1, ge=1)
    covered: bool = False
    ev_charging: bool = False
    status: ListingStatus = ListingStatus.draft


class ListingCreate(ListingBase):
    pass


class ListingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=4, max_length=120)
    description: str | None = Field(default=None, min_length=20)
    price_cents: int | None = Field(default=None, ge=0)
    capacity: int | None = Field(default=None, ge=1)
    covered: bool | None = None
    ev_charging: bool | None = None
    status: ListingStatus | None = None


class ListingRead(ListingBase):
    id: UUID
    host_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ListingSearchResult(BaseModel):
    items: list[ListingRead]
    total: int
