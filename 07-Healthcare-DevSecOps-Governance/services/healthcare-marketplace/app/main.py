from enum import StrEnum
from typing import Annotated

from fastapi import Depends
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import AnyHttpUrl, BaseModel, Field

app = secure_app("healthcare-marketplace")


class Vendor(StrEnum):
    epic = "epic"
    cerner = "cerner"
    meditech = "meditech"
    firely = "firely"
    redox = "redox"
    azure_health_data_services = "azure_health_data_services"
    aws_healthlake = "aws_healthlake"


class Connection(BaseModel):
    vendor: Vendor
    base_url: AnyHttpUrl
    auth_profile_reference: str = Field(pattern=r"^vault://[a-zA-Z0-9/_-]+$")
    fhir_version: str = Field(default="R4", pattern=r"^(R4|R4B)$")
    smart_scopes: list[str] = Field(default_factory=list, max_length=50)
    data_residency: str


@app.get("/v1/connectors")
async def connectors(
    _: Annotated[Principal, Depends(require_roles("developer", "tenant_admin", "auditor"))],
):
    return {
        "connectors": [
            {"vendor": vendor, "standards": ["FHIR R4", "SMART on FHIR"], "status": "available"}
            for vendor in Vendor
        ]
    }


@app.post("/v1/connections/validate")
async def validate(
    body: Connection,
    principal: Annotated[
        Principal, Depends(require_roles("developer", "tenant_admin", "security"))
    ],
):
    # Connectivity workers retrieve the secret reference after policy approval.
    return {
        "tenant_id": principal.tenant_id,
        "vendor": body.vendor,
        "status": "validation_queued",
        "checks": ["tls", "oauth-metadata", "smart-capabilities", "fhir-conformance", "residency"],
    }
