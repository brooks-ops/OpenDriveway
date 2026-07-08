from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import require_roles
from app.db.session import get_db
from app.models.booking import Booking
from app.models.listing import Listing
from app.models.user import User, UserRole

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics")
async def metrics(
    _: User = Depends(require_roles(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    users = await db.scalar(select(func.count()).select_from(User))
    listings = await db.scalar(select(func.count()).select_from(Listing))
    bookings = await db.scalar(select(func.count()).select_from(Booking))
    return {
        "users": users or 0,
        "listings": listings or 0,
        "bookings": bookings or 0,
    }
