import asyncio
import time
from dataclasses import dataclass
from typing import Annotated

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from healthgov.config import get_settings

bearer = HTTPBearer(auto_error=False)
_jwks: dict | None = None
_jwks_expires_at = 0.0
_jwks_lock = asyncio.Lock()


async def _get_jwks() -> dict:
    global _jwks, _jwks_expires_at
    settings = get_settings()
    if _jwks and time.monotonic() < _jwks_expires_at:
        return _jwks
    async with _jwks_lock:
        if _jwks and time.monotonic() < _jwks_expires_at:
            return _jwks
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                response = await client.get(str(settings.jwks_url))
                response.raise_for_status()
                candidate = response.json()
            if not candidate.get("keys"):
                raise ValueError("JWKS contains no keys")
            _jwks = candidate
            _jwks_expires_at = time.monotonic() + settings.jwks_cache_seconds
        except (httpx.HTTPError, ValueError):
            # A previously validated key set may bridge a short identity-provider outage,
            # but never indefinitely.
            if not _jwks:
                raise
            _jwks_expires_at = time.monotonic() + 30
        return _jwks


@dataclass(frozen=True)
class Principal:
    subject: str
    tenant_id: str
    roles: frozenset[str]
    purpose: str | None


async def current_principal(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> Principal:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token required"
        )
    settings = get_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            await _get_jwks(),
            algorithms=["RS256"],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
        )
    except (JWTError, httpx.HTTPError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc
    subject = payload.get("sub")
    tenant_id = payload.get("tenant_id")
    if not subject or not tenant_id:
        raise HTTPException(status_code=401, detail="Token lacks subject or tenant context")
    principal = Principal(
        subject=subject,
        tenant_id=tenant_id,
        roles=frozenset(payload.get("roles", [])),
        purpose=request.headers.get("X-Purpose-Of-Use"),
    )
    requested_tenant = request.headers.get("X-Tenant-ID")
    if requested_tenant and requested_tenant != principal.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant context mismatch")
    request.state.principal = principal
    return principal


def require_roles(*allowed: str):
    async def dependency(
        principal: Annotated[Principal, Depends(current_principal)],
    ) -> Principal:
        if not principal.roles.intersection(allowed):
            raise HTTPException(status_code=403, detail="Insufficient role")
        if not principal.purpose:
            raise HTTPException(status_code=400, detail="X-Purpose-Of-Use is required")
        return principal

    return dependency


class DynamicSecretRotator:
    """Handles dynamic database credential rotation, fetching short-lived credentials from Vault."""

    def __init__(self, vault_url: str, vault_token: str, db_role: str) -> None:
        self.vault_url = vault_url
        self.vault_token = vault_token
        self.db_role = db_role
        self._cached_creds: dict | None = None
        self._expires_at = 0.0

    async def get_db_credentials(self) -> dict:
        """Simulates fetching dynamic database credentials from Vault's database secrets engine."""
        if self._cached_creds and time.monotonic() < self._expires_at:
            return self._cached_creds

        # Simulates POST /v1/database/creds/<db_role>
        # In production, this would make an HTTP request to Vault and parse lease_duration
        self._cached_creds = {
            "username": f"v-token-{self.db_role}-{int(time.time())}",
            "password": f"vault-generated-pass-{uuid_like_hash(self.vault_token)}",
        }
        self._expires_at = time.monotonic() + 3600  # 1 hour lease
        return self._cached_creds


def uuid_like_hash(val: str) -> str:
    import hashlib
    return hashlib.md5(val.encode()).hexdigest()
