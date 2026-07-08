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
    database_url: str
    supabase_url: AnyHttpUrl | None = None
    supabase_jwt_audience: str = "authenticated"
    stripe_secret_key: str | None = None
    stripe_connect_refresh_url: str = "http://localhost:5173/dashboard/host"
    stripe_connect_return_url: str = "http://localhost:5173/dashboard/host"
    google_maps_api_key: str | None = Field(default=None)

    @field_validator("supabase_url", "stripe_secret_key", "google_maps_api_key", mode="before")
    @classmethod
    def empty_string_as_none(cls, value: str | None) -> str | None:
        if value == "":
            return None
        return value

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.api_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
