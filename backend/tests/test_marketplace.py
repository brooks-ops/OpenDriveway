from datetime import UTC, datetime, timedelta

import pytest
from conftest import demo_headers

from app.core.config import Settings


async def test_search_returns_active_listings(client, active_listing):
    response = await client.get("/api/listings", params={"q": "Museum"})

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == str(active_listing.id)


async def test_search_returns_nearby_listings(client, active_listing):
    response = await client.get(
        "/api/listings",
        params={"lat": "41.860100", "lng": "-87.622500", "radius_miles": "1"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == str(active_listing.id)


async def test_search_rejects_partial_location(client):
    response = await client.get("/api/listings", params={"lat": "41.860100"})

    assert response.status_code == 422


async def test_host_can_create_listing(client):
    await client.patch("/api/auth/me", headers=demo_headers("host@opendriveway.dev"), json={"role": "host"})

    response = await client.post(
        "/api/listings",
        headers=demo_headers("host@opendriveway.dev"),
        json={
            "title": "Garage apron near the stadium",
            "description": "A real-looking local test listing with enough detail for API validation.",
            "address_line1": "1819 S Calumet Ave",
            "address_line2": None,
            "city": "Chicago",
            "state": "IL",
            "postal_code": "60616",
            "country": "US",
            "latitude": "41.857620",
            "longitude": "-87.618920",
            "price_cents": 2800,
            "currency": "usd",
            "capacity": 2,
            "covered": False,
            "ev_charging": False,
            "status": "active",
        },
    )

    assert response.status_code == 201
    assert response.json()["title"] == "Garage apron near the stadium"


async def test_driver_cannot_create_listing(client):
    me = await client.get("/api/auth/me", headers=demo_headers("driver@opendriveway.dev"))
    assert me.status_code == 200
    assert me.json()["role"] == "driver"

    response = await client.post(
        "/api/listings",
        headers=demo_headers("driver@opendriveway.dev"),
        json={
            "title": "Blocked listing",
            "description": "This request should be rejected because the user is not a host.",
            "address_line1": "1 Test Ave",
            "address_line2": None,
            "city": "Chicago",
            "state": "IL",
            "postal_code": "60616",
            "country": "US",
            "latitude": "41.857620",
            "longitude": "-87.618920",
            "price_cents": 1000,
            "currency": "usd",
            "capacity": 1,
            "covered": False,
            "ev_charging": False,
            "status": "active",
        },
    )

    assert response.status_code == 403


async def test_driver_can_create_reservation(client, active_listing):
    start_at = datetime.now(UTC) + timedelta(days=1)
    end_at = start_at + timedelta(hours=3)

    response = await client.post(
        "/api/bookings",
        headers=demo_headers("driver@opendriveway.dev"),
        json={
            "listing_id": str(active_listing.id),
            "start_at": start_at.isoformat(),
            "end_at": end_at.isoformat(),
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["listing_id"] == str(active_listing.id)
    assert body["total_cents"] == 6000


async def test_demo_checkout_confirms_reservation(client, active_listing):
    start_at = datetime.now(UTC) + timedelta(days=1)
    end_at = start_at + timedelta(hours=3)

    booking_response = await client.post(
        "/api/bookings",
        headers=demo_headers("driver@opendriveway.dev"),
        json={
            "listing_id": str(active_listing.id),
            "start_at": start_at.isoformat(),
            "end_at": end_at.isoformat(),
        },
    )
    assert booking_response.status_code == 201
    booking_id = booking_response.json()["id"]

    checkout_response = await client.post(
        f"/api/payments/bookings/{booking_id}/checkout-session",
        headers=demo_headers("driver@opendriveway.dev"),
    )

    assert checkout_response.status_code == 200
    assert checkout_response.json()["booking_id"] == booking_id
    assert "payment=demo" in checkout_response.json()["url"]

    refreshed = await client.get(f"/api/bookings/{booking_id}", headers=demo_headers("driver@opendriveway.dev"))
    assert refreshed.status_code == 200
    assert refreshed.json()["status"] == "confirmed"


async def test_checkout_rejects_other_driver_booking(client, active_listing):
    start_at = datetime.now(UTC) + timedelta(days=1)
    end_at = start_at + timedelta(hours=2)

    booking_response = await client.post(
        "/api/bookings",
        headers=demo_headers("driver-one@opendriveway.dev"),
        json={
            "listing_id": str(active_listing.id),
            "start_at": start_at.isoformat(),
            "end_at": end_at.isoformat(),
        },
    )
    assert booking_response.status_code == 201

    response = await client.post(
        f"/api/payments/bookings/{booking_response.json()['id']}/checkout-session",
        headers=demo_headers("driver-two@opendriveway.dev"),
    )

    assert response.status_code == 404


async def test_reservation_rounds_partial_hours_up(client, active_listing):
    start_at = datetime.now(UTC) + timedelta(days=2)
    end_at = start_at + timedelta(minutes=90)

    response = await client.post(
        "/api/bookings",
        headers=demo_headers("driver@opendriveway.dev"),
        json={
            "listing_id": str(active_listing.id),
            "start_at": start_at.isoformat(),
            "end_at": end_at.isoformat(),
        },
    )

    assert response.status_code == 201
    assert response.json()["total_cents"] == 4000


async def test_reservation_rejects_overlapping_capacity(client, active_listing):
    start_at = datetime.now(UTC) + timedelta(days=3)
    end_at = start_at + timedelta(hours=2)

    first = await client.post(
        "/api/bookings",
        headers=demo_headers("driver-one@opendriveway.dev"),
        json={
            "listing_id": str(active_listing.id),
            "start_at": start_at.isoformat(),
            "end_at": end_at.isoformat(),
        },
    )
    assert first.status_code == 201

    second = await client.post(
        "/api/bookings",
        headers=demo_headers("driver-two@opendriveway.dev"),
        json={
            "listing_id": str(active_listing.id),
            "start_at": (start_at + timedelta(minutes=30)).isoformat(),
            "end_at": (end_at + timedelta(minutes=30)).isoformat(),
        },
    )

    assert second.status_code == 409


async def test_reservation_rejects_invalid_time_order(client, active_listing):
    start_at = datetime.now(UTC) + timedelta(days=1)

    response = await client.post(
        "/api/bookings",
        headers=demo_headers("driver@opendriveway.dev"),
        json={
            "listing_id": str(active_listing.id),
            "start_at": start_at.isoformat(),
            "end_at": start_at.isoformat(),
        },
    )

    assert response.status_code == 422


async def test_reservation_rejects_past_start_time(client, active_listing):
    start_at = datetime.now(UTC) - timedelta(hours=2)
    end_at = start_at + timedelta(hours=1)

    response = await client.post(
        "/api/bookings",
        headers=demo_headers("driver@opendriveway.dev"),
        json={
            "listing_id": str(active_listing.id),
            "start_at": start_at.isoformat(),
            "end_at": end_at.isoformat(),
        },
    )

    assert response.status_code == 422


async def test_protected_routes_require_auth(client):
    response = await client.get("/api/auth/me")
    assert response.status_code == 401


def test_production_config_allows_stripe_disabled_initial_launch():
    settings = Settings(
        app_env="production",
        local_demo_mode=False,
        api_cors_origins="https://opendriveway.example",
        database_url="postgresql+asyncpg://user:pass@db.example/opendriveway",
        supabase_url="https://odciideyuiltpqdsqenk.supabase.co",
        stripe_enabled=False,
        google_maps_api_key="test-google-key",
    )

    settings.validate_production_ready()


def test_production_config_requires_stripe_secrets_when_enabled():
    settings = Settings(
        app_env="production",
        local_demo_mode=False,
        api_cors_origins="https://opendriveway.example",
        database_url="postgresql+asyncpg://user:pass@db.example/opendriveway",
        supabase_url="https://odciideyuiltpqdsqenk.supabase.co",
        stripe_enabled=True,
        google_maps_api_key="test-google-key",
    )

    with pytest.raises(RuntimeError, match="STRIPE_SECRET_KEY"):
        settings.validate_production_ready()
