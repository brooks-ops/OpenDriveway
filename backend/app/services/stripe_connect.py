from fastapi import HTTPException, status
import stripe

from app.core.config import Settings
from app.models.booking import Booking
from app.models.listing import Listing
from app.models.payment import HostPayoutAccount
from app.models.user import User


class StripeConnectService:
    def __init__(self, settings: Settings):
        if not settings.stripe_secret_key:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Stripe secret key is not configured")
        stripe.api_key = settings.stripe_secret_key
        self.settings = settings

    def create_account(self, user: User) -> stripe.Account:
        return stripe.Account.create(
            type="express",
            email=user.email,
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            metadata={"user_id": str(user.id)},
        )

    def create_onboarding_link(self, account_id: str) -> str:
        link = stripe.AccountLink.create(
            account=account_id,
            refresh_url=self.settings.stripe_connect_refresh_url,
            return_url=self.settings.stripe_connect_return_url,
            type="account_onboarding",
        )
        return str(link.url)

    def create_checkout_session(
        self,
        booking: Booking,
        listing: Listing,
        host_account: HostPayoutAccount,
    ) -> stripe.checkout.Session:
        application_fee_amount = round(booking.total_cents * (self.settings.stripe_platform_fee_bps / 10_000))
        return stripe.checkout.Session.create(
            mode="payment",
            success_url=f"{self.settings.frontend_url.rstrip('/')}/dashboard?booking={booking.id}&payment=success",
            cancel_url=f"{self.settings.frontend_url.rstrip('/')}/listings/{listing.id}?payment=cancelled",
            line_items=[
                {
                    "quantity": 1,
                    "price_data": {
                        "currency": booking.currency,
                        "unit_amount": booking.total_cents,
                        "product_data": {
                            "name": f"Parking reservation: {listing.title}",
                            "description": f"{booking.start_at.isoformat()} to {booking.end_at.isoformat()}",
                        },
                    },
                }
            ],
            payment_intent_data={
                "application_fee_amount": application_fee_amount,
                "transfer_data": {"destination": host_account.stripe_account_id},
                "metadata": {
                    "booking_id": str(booking.id),
                    "listing_id": str(listing.id),
                    "driver_id": str(booking.driver_id),
                    "host_id": str(listing.host_id),
                },
            },
            metadata={
                "booking_id": str(booking.id),
                "listing_id": str(listing.id),
                "driver_id": str(booking.driver_id),
                "host_id": str(listing.host_id),
            },
        )

    def construct_webhook_event(self, payload: bytes, signature: str | None) -> stripe.Event:
        if not self.settings.stripe_webhook_secret:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Stripe webhook secret is not configured")
        try:
            return stripe.Webhook.construct_event(payload, signature or "", self.settings.stripe_webhook_secret)
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid Stripe webhook payload") from exc
        except stripe.SignatureVerificationError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid Stripe webhook signature") from exc
