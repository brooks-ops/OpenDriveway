from functools import lru_cache

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file="backend/.env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "local"
    local_demo_mode: bool = False
    api_cors_origins: str = "http://localhost:5173"
    frontend_url: str = "http://localhost:5173"
    database_url: str
    supabase_url: AnyHttpUrl | None = None
    supabase_jwt_audience: str = "authenticated"
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_connect_refresh_url: str = "http://localhost:5173/dashboard/host"
    stripe_connect_return_url: str = "http://localhost:5173/dashboard/host"
    stripe_platform_fee_bps: int = 1000
    google_maps_api_key: str | None = Field(default=None)

    @field_validator("supabase_url", "stripe_secret_key", "stripe_webhook_secret", "google_maps_api_key", mode="before")
    @classmethod
    def empty_string_as_none(cls, value: str | None) -> str | None:
        if value == "":
            return None
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.api_cors_origins.split(",") if origin.strip()]

    def validate_production_ready(self) -> None:
        if self.app_env != "production":
            return

        missing: list[str] = []
        if self.local_demo_mode:
            missing.append("LOCAL_DEMO_MODE must be false")
        if self.supabase_url is None:
            missing.append("SUPABASE_URL")
        if not self.stripe_secret_key:
            missing.append("STRIPE_SECRET_KEY")
        if not self.stripe_webhook_secret:
            missing.append("STRIPE_WEBHOOK_SECRET")
        if not self.google_maps_api_key:
            missing.append("GOOGLE_MAPS_API_KEY")
        if any(origin.startswith("http://localhost") for origin in self.cors_origins):
            missing.append("API_CORS_ORIGINS must not include localhost")

        if missing:
            raise RuntimeError(f"Production configuration is incomplete: {', '.join(missing)}")


@lru_cache
def get_settings() -> Settings:
    return Settings()
