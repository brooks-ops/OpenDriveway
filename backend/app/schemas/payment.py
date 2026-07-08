from pydantic import BaseModel


class StripeOnboardingLink(BaseModel):
    url: str


class StripeCheckoutSession(BaseModel):
    url: str
    booking_id: str
