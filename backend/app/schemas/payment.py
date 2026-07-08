from pydantic import BaseModel


class StripeOnboardingLink(BaseModel):
    url: str
