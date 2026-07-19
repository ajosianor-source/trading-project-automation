from dataclasses import dataclass
from typing import Annotated

import requests
from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import get_settings

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    subject: str
    tenant_id: str
    roles: frozenset[str]


async def principal(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    tenant_header: Annotated[str | None, Header(alias="X-Tenant-ID")] = None,
) -> Principal:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Bearer token required")
    settings = get_settings()
    try:
        # Production should front this service with the platform gateway.
        jwks = await __import__("asyncio").to_thread(
            requests.get,
            settings.jwks_url,
            timeout=(3.05, 5),
        )
        jwks.raise_for_status()
        payload = jwt.decode(
            credentials.credentials,
            jwks.json(),
            algorithms=["RS256"],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
        )
    except (requests.RequestException, JWTError, ValueError) as exc:
        raise HTTPException(status_code=401, detail="Invalid access token") from exc
    subject = payload.get("sub")
    tenant_id = payload.get("tenant_id")
    if not subject or not tenant_id:
        raise HTTPException(status_code=401, detail="Token lacks subject or tenant context")
    identity = Principal(
        subject=subject,
        tenant_id=tenant_id,
        roles=frozenset(payload.get("roles", [])),
    )
    if tenant_header and tenant_header != identity.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant context mismatch")
    return identity


def require_roles(*roles: str):
    async def dependency(identity: Annotated[Principal, Depends(principal)]) -> Principal:
        if not identity.roles.intersection(roles):
            raise HTTPException(status_code=403, detail="Insufficient role")
        return identity

    return dependency
