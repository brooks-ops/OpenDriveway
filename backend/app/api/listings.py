from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import Float, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, require_roles
from app.db.session import get_db
from app.models.listing import Listing, ListingStatus
from app.models.user import User, UserRole
from app.schemas.listing import ListingCreate, ListingRead, ListingSearchResult, ListingUpdate

router = APIRouter(prefix="/listings", tags=["listings"])

EARTH_RADIUS_MILES = 3958.8


def distance_miles_expression(latitude: float, longitude: float):
    listing_latitude = cast(Listing.latitude, Float)
    listing_longitude = cast(Listing.longitude, Float)
    return EARTH_RADIUS_MILES * func.acos(
        func.least(
            1.0,
            func.greatest(
                -1.0,
                func.cos(func.radians(latitude))
                * func.cos(func.radians(listing_latitude))
                * func.cos(func.radians(listing_longitude) - func.radians(longitude))
                + func.sin(func.radians(latitude)) * func.sin(func.radians(listing_latitude)),
            ),
        )
    )


@router.get("", response_model=ListingSearchResult)
async def search_listings(
    q: str | None = Query(default=None, max_length=120),
    city: str | None = Query(default=None, max_length=90),
    state: str | None = Query(default=None, max_length=40),
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    radius_miles: float = Query(default=25, ge=0.1, le=100),
    limit: int = Query(default=12, ge=1, le=50),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> ListingSearchResult:
    if (lat is None) != (lng is None):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Both lat and lng are required for location search")

    filters = [Listing.status == ListingStatus.active]
    if q:
        term = f"%{q}%"
        filters.append(or_(Listing.title.ilike(term), Listing.description.ilike(term), Listing.city.ilike(term)))
    if city:
        filters.append(Listing.city.ilike(city))
    if state:
        filters.append(Listing.state.ilike(state))
    distance_expr = distance_miles_expression(lat, lng) if lat is not None and lng is not None else None
    if distance_expr is not None:
        filters.append(distance_expr <= radius_miles)

    total = await db.scalar(select(func.count()).select_from(Listing).where(*filters))
    order_by = [distance_expr.asc(), Listing.created_at.desc()] if distance_expr is not None else [Listing.created_at.desc()]
    result = await db.scalars(select(Listing).where(*filters).order_by(*order_by).limit(limit).offset(offset))
    return ListingSearchResult(items=list(result), total=total or 0)


@router.post("", response_model=ListingRead, status_code=status.HTTP_201_CREATED)
async def create_listing(
    payload: ListingCreate,
    current_user: User = Depends(require_roles(UserRole.host, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
) -> Listing:
    listing = Listing(host_id=current_user.id, **payload.model_dump())
    db.add(listing)
    await db.commit()
    await db.refresh(listing)
    return listing


@router.get("/host/mine", response_model=list[ListingRead])
async def my_listings(
    current_user: User = Depends(require_roles(UserRole.host, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
) -> list[Listing]:
    result = await db.scalars(select(Listing).where(Listing.host_id == current_user.id).order_by(Listing.created_at.desc()))
    return list(result)


@router.get("/{listing_id}", response_model=ListingRead)
async def get_listing(listing_id: UUID, db: AsyncSession = Depends(get_db)) -> Listing:
    listing = await db.get(Listing, listing_id)
    if listing is None or listing.status != ListingStatus.active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    return listing


@router.patch("/{listing_id}", response_model=ListingRead)
async def update_listing(
    listing_id: UUID,
    payload: ListingUpdate,
    current_user: User = Depends(require_roles(UserRole.host, UserRole.admin)),
    db: AsyncSession = Depends(get_db),
) -> Listing:
    listing = await db.get(Listing, listing_id)
    if listing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Listing not found")
    if listing.host_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot update this listing")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(listing, key, value)
    await db.commit()
    await db.refresh(listing)
    return listing
