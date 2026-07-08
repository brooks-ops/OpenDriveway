from fastapi import APIRouter, Depends, HTTPException, Query, status
import httpx

from app.core.config import Settings, get_settings

router = APIRouter(prefix="/maps", tags=["maps"])


@router.get("/geocode")
async def geocode(
    address: str = Query(min_length=4, max_length=300),
    settings: Settings = Depends(get_settings),
) -> dict:
    if settings.local_demo_mode and not settings.google_maps_api_key:
        return {
            "status": "OK",
            "results": [
                {
                    "formatted_address": f"{address} (local demo geocode)",
                    "geometry": {"location": {"lat": 41.8623, "lng": -87.6167}},
                }
            ],
        }
    if not settings.google_maps_api_key:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Google Maps API key is not configured")

    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": address, "key": settings.google_maps_api_key},
        )
        response.raise_for_status()
    return response.json()
