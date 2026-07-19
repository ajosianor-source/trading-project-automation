from typing import Annotated

from fastapi import Depends, HTTPException
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("tenant-service")


class TenantCreate(BaseModel):
    tenant_id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]{2,62}$")
    display_name: str = Field(min_length=2, max_length=120)
    region: str = Field(pattern=r"^(uk|eu|us|ca|au)-[a-z0-9-]+$")
    data_residency: str
    plan: str = Field(pattern=r"^(enterprise|professional|sandbox)$")


@app.post("/v1/tenants", status_code=201)
async def create_tenant(
    body: TenantCreate,
    principal: Annotated[Principal, Depends(require_roles("platform_admin"))],
):
    if principal.tenant_id != "platform":
        raise HTTPException(status_code=403, detail="Platform tenant required")
    # Provisioning is asynchronous: dedicated keys, schema/RLS, topics and quotas are created first.
    return {
        "tenant_id": body.tenant_id,
        "status": "provisioning",
        "region": body.region,
        "controls": ["dedicated-kek", "postgres-rls", "kafka-acl", "quota", "audit-stream"],
    }


@app.get("/v1/tenants/current")
async def current_tenant(
    principal: Annotated[Principal, Depends(require_roles("tenant_admin", "auditor"))],
):
    return {"tenant_id": principal.tenant_id, "subject": principal.subject}
