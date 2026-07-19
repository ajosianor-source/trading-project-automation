import base64
import hashlib
import os
import secrets
import time
from contextlib import asynccontextmanager
from typing import Any
from urllib.parse import urlencode

import httpx
import structlog
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import RedirectResponse, Response
from jose import jwt
from pydantic import BaseModel

log = structlog.get_logger()

private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
private_pem = private_key.private_bytes(
    serialization.Encoding.PEM,
    serialization.PrivateFormat.PKCS8,
    serialization.NoEncryption(),
)
public_numbers = private_key.public_key().public_numbers()
KID = hashlib.sha256(str(public_numbers.n).encode()).hexdigest()[:16]
ISSUER = "http://host.docker.internal:8080/"
AUDIENCE = "healthgov-api"
codes: dict[str, dict[str, Any]] = {}
sessions: dict[str, dict[str, Any]] = {}

# Production OIDC Provider Configuration
OIDC_ISSUER = os.getenv("OIDC_ISSUER")
OIDC_CLIENT_ID = os.getenv("OIDC_CLIENT_ID", "healthgov-portal")
OIDC_CLIENT_SECRET = os.getenv("OIDC_CLIENT_SECRET")
OIDC_SCOPES = os.getenv("OIDC_SCOPES", "openid profile email roles")
OIDC_ACR_VALUES = os.getenv("OIDC_ACR_VALUES", "phishing-resistant")

oidc_config: dict[str, Any] = {}
oidc_jwks: dict[str, Any] = {}

UPSTREAMS = {
    "synthetic": os.getenv("SYNTHETIC_PHI_URL", "http://127.0.0.1:8020"),
    "compliance-events": os.getenv(
        "COMPLIANCE_EVENT_URL", "http://127.0.0.1:8021"
    ),
    "dsp": os.getenv("DSP_TOOLKIT_URL", "http://127.0.0.1:8022"),
    "iso27001": os.getenv("ISO27001_URL", "http://127.0.0.1:8023"),
    "soc2": os.getenv("SOC2_URL", "http://127.0.0.1:8024"),
    "iomt-security": os.getenv("IOMT_SECURITY_URL", "http://127.0.0.1:8025"),
    "audit": os.getenv("AUDIT_SERVICE_URL", "http://127.0.0.1:8004"),
    "data-store": os.getenv("DATA_STORE_URL", "http://127.0.0.1:8014"),
    "ingestion": os.getenv("DATA_INGESTION_URL", "http://127.0.0.1:8013"),
    "compliance": os.getenv("COMPLIANCE_ENGINE_URL", "http://127.0.0.1:8002"),
    "alerts": os.getenv("ALERTING_ENGINE_URL", "http://127.0.0.1:8015"),
    "risk": os.getenv("RISK_ENGINE_URL", "http://127.0.0.1:8007"),
    "marketplace": os.getenv("MARKETPLACE_URL", "http://127.0.0.1:8019"),
}
DEFAULT_ROLES = [
    "platform_admin", "developer", "data_steward", "compliance", "auditor",
    "security", "executive", "service", "device_provisioner", "firmware_scanner",
    "medical_device",
    "data_engineer", "integration", "researcher", "privacy_officer",
]


def assert_staging_only() -> None:
    """Fail closed: this ephemeral issuer must never become production identity unless configured with a real OIDC provider."""
    if os.getenv("ENVIRONMENT", "development").lower() == "production":
        if not OIDC_ISSUER:
            raise RuntimeError(
                "local-auth-bff is forbidden in production unless configured with an approved OIDC provider (OIDC_ISSUER)"
            )
    elif os.getenv("ALLOW_STAGING_SESSION") != "true":
        raise RuntimeError("local-auth-bff requires explicit ALLOW_STAGING_SESSION=true in development")


@asynccontextmanager
async def lifespan(_: FastAPI):
    assert_staging_only()
    if OIDC_ISSUER:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{OIDC_ISSUER}/.well-known/openid-configuration")
                response.raise_for_status()
                oidc_config.update(response.json())
                
                jwks_uri = oidc_config.get("jwks_uri")
                if jwks_uri:
                    jwks_response = await client.get(jwks_uri)
                    jwks_response.raise_for_status()
                    oidc_jwks.update(jwks_response.json())
            log.info("oidc_configuration_loaded", issuer=OIDC_ISSUER)
        except Exception as exc:
            log.error("oidc_configuration_failed", error=str(exc))
            raise RuntimeError(f"Failed to load OIDC configuration: {str(exc)}") from exc
    yield


app = FastAPI(
    title="HealthGov staging identity BFF",
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


def _b64(value: int) -> str:
    raw = value.to_bytes((value.bit_length() + 7) // 8, "big")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def _token(tenant_id: str = "staging-hospital", roles: list[str] | None = None) -> str:
    now = int(time.time())
    return jwt.encode(
        {
            "sub": "joy.abu",
            "tenant_id": tenant_id,
            "roles": roles or DEFAULT_ROLES,
            "iss": ISSUER,
            "aud": AUDIENCE,
            "iat": now,
            "exp": now + 3600,
        },
        private_pem,
        algorithm="RS256",
        headers={"kid": KID},
    )


@app.get("/.well-known/jwks.json")
async def jwks():
    return {"keys": [{"kty": "RSA", "kid": KID, "use": "sig", "alg": "RS256",
                      "n": _b64(public_numbers.n), "e": _b64(public_numbers.e)}]}


@app.get("/authorize")
async def authorize(
    redirect_uri: str, state: str, code_challenge: str, client_id: str = "healthgov-portal"
):
    allowed_redirects = (
        "http://127.0.0.1:3000/",
        "http://localhost:3000/",
    )
    if client_id != OIDC_CLIENT_ID or not any(redirect_uri.startswith(r) for r in allowed_redirects):
        raise HTTPException(status_code=400, detail="Unregistered client or redirect URI")

    if OIDC_ISSUER:
        auth_endpoint = oidc_config.get("authorization_endpoint")
        if not auth_endpoint:
            raise HTTPException(status_code=500, detail="OIDC authorization endpoint not found")
        
        params = {
            "client_id": OIDC_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": OIDC_SCOPES,
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "acr_values": OIDC_ACR_VALUES,
        }
        return RedirectResponse(f"{auth_endpoint}?{urlencode(params)}")

    code = secrets.token_urlsafe(32)
    codes[code] = {"challenge": code_challenge, "expires": time.time() + 120}
    return RedirectResponse(f"{redirect_uri}?{urlencode({'code': code, 'state': state})}")


class Exchange(BaseModel):
    code: str
    verifier: str
    redirectUri: str


@app.post("/v1/session/exchange")
async def exchange(body: Exchange):
    if OIDC_ISSUER:
        token_endpoint = oidc_config.get("token_endpoint")
        if not token_endpoint:
            raise HTTPException(status_code=500, detail="OIDC token endpoint not found")
        
        data = {
            "grant_type": "authorization_code",
            "code": body.code,
            "redirect_uri": body.redirectUri,
            "client_id": OIDC_CLIENT_ID,
            "code_verifier": body.verifier,
        }
        if OIDC_CLIENT_SECRET:
            data["client_secret"] = OIDC_CLIENT_SECRET
            
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(token_endpoint, data=data)
            if not response.is_success:
                raise HTTPException(status_code=401, detail=f"OIDC token exchange failed: {response.text}")
            tokens = response.json()
            
        id_token = tokens.get("id_token")
        access_token = tokens.get("access_token")
        if not id_token or not access_token:
            raise HTTPException(status_code=401, detail="OIDC provider did not return required tokens")
            
        try:
            payload = jwt.decode(
                id_token,
                oidc_jwks,
                algorithms=["RS256"],
                audience=OIDC_CLIENT_ID,
                issuer=OIDC_ISSUER,
            )
        except Exception as exc:
            raise HTTPException(status_code=401, detail=f"Invalid OIDC ID token: {str(exc)}") from exc
            
        acr = payload.get("acr")
        if OIDC_ACR_VALUES and acr != OIDC_ACR_VALUES:
            log.warning("mfa_not_phishing_resistant", acr=acr, expected=OIDC_ACR_VALUES)
            
        session_id = secrets.token_urlsafe(32)
        sessions[session_id] = {
            "token": access_token,
            "id_token": id_token,
            "payload": payload,
            "expires": time.time() + tokens.get("expires_in", 3600),
        }
        return {"sessionId": session_id, "expiresIn": tokens.get("expires_in", 3600)}

    record = codes.pop(body.code, None)
    digest = hashlib.sha256(body.verifier.encode()).digest()
    challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
    if not record or record["expires"] < time.time() or challenge != record["challenge"]:
        raise HTTPException(status_code=401, detail="Invalid authorization code")
    session_id = secrets.token_urlsafe(32)
    sessions[session_id] = {"token": _token(), "expires": time.time() + 8 * 3600}
    return {"sessionId": session_id, "expiresIn": 8 * 3600}


class TokenRequest(BaseModel):
    tenant_id: str = "staging-hospital"
    roles: list[str] = DEFAULT_ROLES


@app.post("/v1/staging/token")
async def staging_token(body: TokenRequest):
    return {"access_token": _token(body.tenant_id, body.roles), "token_type": "Bearer"}


@app.post("/v1/staging/session")
async def staging_session():
    """Create an opaque local session without relying on browser-side JavaScript.

    This BFF exists only in the local staging topology and is never deployed as
    the production identity provider.
    """
    if os.getenv("ALLOW_STAGING_SESSION") != "true":
        raise HTTPException(status_code=404, detail="Staging session endpoint is disabled")
    session_id = secrets.token_urlsafe(32)
    sessions[session_id] = {"token": _token(), "expires": time.time() + 8 * 3600}
    return {"sessionId": session_id, "expiresIn": 8 * 3600}


@app.api_route("/v1/session/proxy/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def proxy(
    path: str,
    request: Request,
    x_session_id: str = Header(),
    x_purpose_of_use: str = Header(),
):
    session = sessions.get(x_session_id)
    if not session or session["expires"] < time.time():
        raise HTTPException(status_code=401, detail="Session expired")
    prefix = path.split("/", 1)[0]
    upstream = UPSTREAMS.get(prefix)
    if not upstream:
        raise HTTPException(status_code=404, detail="Unknown staging service")
    suffix = path[len(prefix):] or "/"
    target = f"{upstream}{suffix}"
    headers = {
        "Authorization": f"Bearer {session['token']}",
        "X-Purpose-Of-Use": x_purpose_of_use,
        "Content-Type": request.headers.get("content-type", "application/json"),
    }
    async with httpx.AsyncClient(timeout=20) as client:
        result = await client.request(
            request.method,
            target,
            params=request.query_params,
            content=await request.body(),
            headers=headers,
        )
    return Response(
        result.content,
        status_code=result.status_code,
        media_type=result.headers.get("content-type"),
        headers={"Cache-Control": "no-store"},
    )


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}
