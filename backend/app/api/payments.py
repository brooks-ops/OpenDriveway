from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import require_roles
from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models.payment import HostPayoutAccount
from app.models.user import User, UserRole
from app.schemas.payment import StripeOnboardingLink
from app.services.stripe_connect import StripeConnectService

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/connect/onboarding-link", response_model=StripeOnboardingLink)
async def create_connect_onboarding_link(
    current_user: User = Depends(require_roles(UserRole.host, UserRole.admin)),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> StripeOnboardingLink:
    if settings.local_demo_mode and not settings.stripe_secret_key:
        return StripeOnboardingLink(url=settings.stripe_connect_return_url)

    service = StripeConnectService(settings)
    host = await db.scalar(
        select(User)
        .options(selectinload(User.payout_account))
        .where(User.id == current_user.id)
    )
    payout_account = host.payout_account if host else None
    if payout_account is None:
        account = service.create_account(current_user)
        payout_account = HostPayoutAccount(host_id=current_user.id, stripe_account_id=account.id)
        db.add(payout_account)
        await db.commit()
        await db.refresh(payout_account)

    return StripeOnboardingLink(url=service.create_onboarding_link(payout_account.stripe_account_id))
