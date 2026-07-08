from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.auth import get_current_user
from app.core.auth import require_roles
from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models.booking import Booking, BookingStatus
from app.models.payment import HostPayoutAccount, Payment, PaymentStatus
from app.models.user import User, UserRole
from app.schemas.payment import StripeCheckoutSession, StripeOnboardingLink
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


@router.post("/bookings/{booking_id}/checkout-session", response_model=StripeCheckoutSession)
async def create_booking_checkout_session(
    request: Request,
    booking_id: UUID,
    current_user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> StripeCheckoutSession:
    booking = await db.scalar(
        select(Booking)
        .options(joinedload(Booking.listing))
        .where(Booking.id == booking_id, Booking.driver_id == current_user.id)
    )
    if booking is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Booking not found")
    if booking.status != BookingStatus.pending_payment:
        raise HTTPException(status.HTTP_409_CONFLICT, "Booking is not awaiting payment")

    if settings.local_demo_mode and not settings.stripe_secret_key:
        frontend_url = request.headers.get("origin") or settings.frontend_url
        booking.status = BookingStatus.confirmed
        db.add(
            Payment(
                booking_id=booking.id,
                stripe_payment_intent_id=f"demo_payment_intent_{booking.id}",
                status=PaymentStatus.succeeded,
            )
        )
        await db.commit()
        return StripeCheckoutSession(
            url=f"{frontend_url.rstrip('/')}/dashboard?booking={booking.id}&payment=demo",
            booking_id=str(booking.id),
        )

    payout_account = await db.scalar(select(HostPayoutAccount).where(HostPayoutAccount.host_id == booking.listing.host_id))
    if payout_account is None or not payout_account.charges_enabled:
        raise HTTPException(status.HTTP_409_CONFLICT, "This host cannot accept payments yet")

    service = StripeConnectService(settings)
    session = service.create_checkout_session(booking, booking.listing, payout_account)
    if not session.url:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Stripe did not return a checkout URL")
    return StripeCheckoutSession(url=str(session.url), booking_id=str(booking.id))


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="Stripe-Signature"),
    settings: Settings = Depends(get_settings),
    db: AsyncSession = Depends(get_db),
) -> dict[str, bool]:
    payload = await request.body()
    if settings.local_demo_mode and not settings.stripe_secret_key:
        event = await request.json()
    else:
        event = StripeConnectService(settings).construct_webhook_event(payload, stripe_signature)

    event_type = event["type"]
    event_object = event["data"]["object"]

    if event_type == "checkout.session.completed":
        booking_id = event_object.get("metadata", {}).get("booking_id")
        payment_intent_id = event_object.get("payment_intent")
        if booking_id and payment_intent_id:
            booking = await db.get(Booking, UUID(booking_id))
            if booking:
                booking.status = BookingStatus.confirmed
                payment = await db.scalar(select(Payment).where(Payment.booking_id == booking.id))
                if payment is None:
                    db.add(
                        Payment(
                            booking_id=booking.id,
                            stripe_payment_intent_id=str(payment_intent_id),
                            status=PaymentStatus.succeeded,
                        )
                    )
                else:
                    payment.status = PaymentStatus.succeeded
                    payment.stripe_payment_intent_id = str(payment_intent_id)

    if event_type == "payment_intent.payment_failed":
        booking_id = event_object.get("metadata", {}).get("booking_id")
        if booking_id:
            payment = await db.scalar(select(Payment).where(Payment.booking_id == UUID(booking_id)))
            if payment:
                payment.status = PaymentStatus.failed

    if event_type == "account.updated":
        account_id = event_object.get("id")
        if account_id:
            payout_account = await db.scalar(select(HostPayoutAccount).where(HostPayoutAccount.stripe_account_id == account_id))
            if payout_account:
                payout_account.charges_enabled = bool(event_object.get("charges_enabled"))
                payout_account.payouts_enabled = bool(event_object.get("payouts_enabled"))
                details_submitted = bool(event_object.get("details_submitted"))
                payout_account.onboarding_complete = details_submitted and payout_account.charges_enabled and payout_account.payouts_enabled

    await db.commit()
    return {"received": True}
