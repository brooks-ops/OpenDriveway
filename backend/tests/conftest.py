import os
import uuid
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from decimal import Decimal

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

os.environ.setdefault("LOCAL_DEMO_MODE", "true")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://opendriveway:opendriveway@localhost:5432/opendriveway")

from app.db.session import AsyncSessionLocal  # noqa: E402
from app.main import app  # noqa: E402
from app.models.booking import Booking  # noqa: E402
from app.models.listing import Listing, ListingStatus  # noqa: E402
from app.models.payment import HostPayoutAccount, Payment  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as test_client:
        yield test_client


@pytest.fixture(autouse=True)
async def clean_database() -> AsyncGenerator[None, None]:
    async with AsyncSessionLocal() as db:
        await db.execute(delete(Payment))
        await db.execute(delete(Booking))
        await db.execute(delete(HostPayoutAccount))
        await db.execute(delete(Listing))
        await db.execute(delete(User))
        await db.commit()
    yield


@pytest.fixture
async def active_listing() -> Listing:
    async with AsyncSessionLocal() as db:
        host = User(
            id=uuid.uuid5(uuid.NAMESPACE_URL, "test-host@opendriveway.dev"),
            email="test-host@opendriveway.dev",
            full_name="Test Host",
            role=UserRole.host,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        listing = Listing(
            host_id=host.id,
            title="Museum Campus driveway space",
            description="A real-looking driveway listing used only by local backend tests.",
            address_line1="1601 S Indiana Ave",
            address_line2=None,
            city="Chicago",
            state="IL",
            postal_code="60616",
            country="US",
            latitude=Decimal("41.860010"),
            longitude=Decimal("-87.622440"),
            price_cents=2000,
            currency="usd",
            capacity=1,
            covered=False,
            ev_charging=False,
            status=ListingStatus.active,
        )
        db.add(host)
        db.add(listing)
        await db.commit()
        await db.refresh(listing)
        return listing


def demo_headers(email: str) -> dict[str, str]:
    return {"X-Demo-Email": email, "X-Demo-Name": email.split("@")[0]}
