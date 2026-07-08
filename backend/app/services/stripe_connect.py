from fastapi import HTTPException, status
import stripe

from app.core.config import Settings
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
