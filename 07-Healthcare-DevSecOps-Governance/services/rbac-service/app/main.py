from typing import Annotated

from fastapi import Depends, HTTPException
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("rbac-service")

ROLE_PERMISSIONS = {
    "admin": {"*"},
    "security_analyst": {"security:read", "security:write", "phi:read", "incident:manage"},
    "compliance_officer": {"compliance:read", "compliance:write", "evidence:approve"},
    "developer": {"developer:read", "api:execute", "security:read"},
    "auditor": {"audit:read", "compliance:read", "evidence:read"},
    "executive": {"executive:read", "risk:read", "compliance:read"},
}


class Assignment(BaseModel):
    subject: str = Field(min_length=3, max_length=256)
    role: str = Field(
        pattern=r"^(admin|security_analyst|compliance_officer|developer|auditor|executive)$"
    )
    scope: str = Field(default="tenant", pattern=r"^(tenant|site|project)$")
    scope_id: str | None = None
    expires_at: str | None = None


class AuthorizationRequest(BaseModel):
    roles: list[str]
    permission: str
    resource_tenant: str
    purpose_of_use: str


@app.get("/v1/roles")
async def roles(_: Annotated[Principal, Depends(require_roles("tenant_admin", "auditor"))]):
    return {
        "roles": [
            {"id": role, "permissions": sorted(permissions)}
            for role, permissions in ROLE_PERMISSIONS.items()
        ]
    }


@app.post("/v1/assignments", status_code=201)
async def assign(
    body: Assignment,
    principal: Annotated[Principal, Depends(require_roles("tenant_admin"))],
):
    return {"tenant_id": principal.tenant_id, "assignment": body, "status": "active"}


@app.post("/v1/authorize")
async def authorize(
    body: AuthorizationRequest,
    principal: Annotated[Principal, Depends(require_roles("service", "tenant_admin"))],
):
    if body.resource_tenant != principal.tenant_id:
        raise HTTPException(status_code=403, detail="Cross-tenant authorization denied")
    permissions = set().union(*(ROLE_PERMISSIONS.get(role, set()) for role in body.roles))
    allowed = "*" in permissions or body.permission in permissions
    return {
        "allowed": allowed,
        "reason": "role_permission_match" if allowed else "permission_missing",
        "purpose_bound": bool(body.purpose_of_use),
    }
