import asyncio
import time
from dataclasses import dataclass
from typing import Annotated

import httpx
from config import get_settings
from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

bearer = HTTPBearer(auto_error=False)
_jwks: dict | None = None
_jwks_expires_at = 0.0
_jwks_lock = asyncio.Lock()


@dataclass(frozen=True)
class Principal:
    subject: str
    tenant_id: str
    roles: frozenset[str]


async def _get_jwks() -> dict:
    global _jwks, _jwks_expires_at
    if _jwks and time.monotonic() < _jwks_expires_at:
        return _jwks
    async with _jwks_lock:
        if _jwks and time.monotonic() < _jwks_expires_at:
            return _jwks
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(get_settings().jwks_url)
            response.raise_for_status()
            _jwks = response.json()
            _jwks_expires_at = time.monotonic() + 300
            return _jwks


async def principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    tenant_header: Annotated[str | None, Header(alias="X-Tenant-ID")] = None,
) -> Principal:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Bearer token required")
    settings = get_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            await _get_jwks(),
            algorithms=["RS256"],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
        )
    except (httpx.HTTPError, JWTError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc
    if not payload.get("sub") or not payload.get("tenant_id"):
        raise HTTPException(status_code=401, detail="Token lacks tenant context")
    identity = Principal(
        subject=str(payload["sub"]),
        tenant_id=str(payload["tenant_id"]),
        roles=frozenset(payload.get("roles", [])),
    )
    if tenant_header and tenant_header != identity.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant context mismatch")
    return identity


def require_roles(*allowed: str):
    async def dependency(identity: Annotated[Principal, Depends(principal)]) -> Principal:
        if not identity.roles.intersection(allowed):
            raise HTTPException(status_code=403, detail="Insufficient role")
        return identity

    return dependency
