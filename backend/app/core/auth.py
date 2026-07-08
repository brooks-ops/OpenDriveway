import uuid
from dataclasses import dataclass

import httpx
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.models.user import User, UserRole

security = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthUser:
    id: uuid.UUID
    email: str
    full_name: str | None


class SupabaseJWTVerifier:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._jwks: dict | None = None

    async def _get_jwks(self) -> dict:
        if self._jwks is not None:
            return self._jwks
        if self.settings.supabase_url is None:
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Supabase URL is not configured")
        url = f"{str(self.settings.supabase_url).rstrip('/')}/auth/v1/.well-known/jwks.json"
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(url)
            response.raise_for_status()
        self._jwks = response.json()
        return self._jwks

    async def verify(self, token: str) -> AuthUser:
        try:
            header = jwt.get_unverified_header(token)
            jwks = await self._get_jwks()
            key = next((candidate for candidate in jwks["keys"] if candidate["kid"] == header["kid"]), None)
            if key is None:
                raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Unknown authentication key")
            payload = jwt.decode(
                token,
                key,
                algorithms=[header.get("alg", "RS256")],
                audience=self.settings.supabase_jwt_audience,
                options={"verify_at_hash": False},
            )
        except (JWTError, httpx.HTTPError, KeyError, StopIteration) as exc:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid authentication token") from exc

        email = payload.get("email")
        subject = payload.get("sub")
        if not email or not subject:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication token is missing required claims")

        metadata = payload.get("user_metadata") or {}
        return AuthUser(id=uuid.UUID(subject), email=email, full_name=metadata.get("full_name") or metadata.get("name"))


async def get_auth_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    x_demo_email: str | None = Header(default=None),
    x_demo_name: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> AuthUser:
    if settings.local_demo_mode and x_demo_email:
        demo_id = uuid.uuid5(uuid.NAMESPACE_URL, f"opendriveway-demo:{x_demo_email.lower()}")
        return AuthUser(id=demo_id, email=x_demo_email, full_name=x_demo_name or "Local Demo User")
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication is required")
    return await SupabaseJWTVerifier(settings).verify(credentials.credentials)


async def get_current_user(
    auth_user: AuthUser = Depends(get_auth_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    user = await db.get(User, auth_user.id)
    if user is None:
        user = User(id=auth_user.id, email=auth_user.email, full_name=auth_user.full_name, role=UserRole.driver)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


def require_roles(*roles: UserRole):
    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return user

    return dependency
