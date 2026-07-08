import asyncio
import uuid
from decimal import Decimal

from sqlalchemy import delete

from app.db.session import AsyncSessionLocal
from app.models.booking import Booking
from app.models.listing import Listing, ListingStatus
from app.models.payment import HostPayoutAccount, Payment
from app.models.user import User, UserRole

DEMO_HOST_ID = uuid.uuid5(uuid.NAMESPACE_URL, "opendriveway-demo:host@opendriveway.dev")

LISTINGS = [
    {
        "title": "South Loop private driveway near Grant Park",
        "description": "Local demo listing for testing event parking near the lakefront and museum campus. Fits a standard sedan or compact SUV.",
        "address_line1": "1438 S Wabash Ave",
        "city": "Chicago",
        "state": "IL",
        "postal_code": "60605",
        "latitude": Decimal("41.862910"),
        "longitude": Decimal("-87.625120"),
        "price_cents": 2200,
        "capacity": 1,
        "covered": False,
        "ev_charging": False,
    },
    {
        "title": "Wide tandem driveway by Soldier Field",
        "description": "Local demo listing for testing game-day parking around Soldier Field, Northerly Island, and Museum Campus events.",
        "address_line1": "1819 S Calumet Ave",
        "city": "Chicago",
        "state": "IL",
        "postal_code": "60616",
        "latitude": Decimal("41.857620"),
        "longitude": Decimal("-87.618920"),
        "price_cents": 2800,
        "capacity": 2,
        "covered": False,
        "ev_charging": False,
    },
    {
        "title": "Covered spot off Michigan Avenue",
        "description": "Local demo listing with a covered parking spot for testing downtown event searches and reservation checkout behavior.",
        "address_line1": "2132 S Michigan Ave",
        "city": "Chicago",
        "state": "IL",
        "postal_code": "60616",
        "latitude": Decimal("41.853680"),
        "longitude": Decimal("-87.623890"),
        "price_cents": 2500,
        "capacity": 1,
        "covered": True,
        "ev_charging": False,
    },
    {
        "title": "EV-ready driveway near McCormick Place",
        "description": "Local demo listing for convention parking tests with EV charging marked as an available amenity.",
        "address_line1": "2301 S Prairie Ave",
        "city": "Chicago",
        "state": "IL",
        "postal_code": "60616",
        "latitude": Decimal("41.850980"),
        "longitude": Decimal("-87.620010"),
        "price_cents": 3200,
        "capacity": 1,
        "covered": False,
        "ev_charging": True,
    },
    {
        "title": "Quiet residential space near Museum Campus",
        "description": "Local demo listing for testing search, listing detail, and reservation creation near a repeat event area.",
        "address_line1": "1601 S Indiana Ave",
        "city": "Chicago",
        "state": "IL",
        "postal_code": "60616",
        "latitude": Decimal("41.860010"),
        "longitude": Decimal("-87.622440"),
        "price_cents": 2000,
        "capacity": 1,
        "covered": False,
        "ev_charging": False,
    },
]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        await db.execute(delete(Payment))
        await db.execute(delete(Booking))
        await db.execute(delete(HostPayoutAccount))
        await db.execute(delete(Listing))
        await db.execute(delete(User).where(User.email.like("%@opendriveway.dev")))

        host = User(
            id=DEMO_HOST_ID,
            email="host@opendriveway.dev",
            full_name="OpenDriveway Demo Host",
            role=UserRole.host,
        )
        db.add(host)
        for listing_data in LISTINGS:
            db.add(
                Listing(
                    host_id=host.id,
                    address_line2=None,
                    country="US",
                    currency="usd",
                    status=ListingStatus.active,
                    **listing_data,
                )
            )

        await db.commit()
    print(f"Seeded {len(LISTINGS)} local/demo listings around Chicago's Museum Campus event area.")


if __name__ == "__main__":
    asyncio.run(main())
