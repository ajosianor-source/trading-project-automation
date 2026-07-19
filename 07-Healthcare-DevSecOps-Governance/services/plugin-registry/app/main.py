from typing import Annotated

from fastapi import Depends
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import AnyHttpUrl, BaseModel, Field

app = secure_app("plugin-registry")


class PluginManifest(BaseModel):
    plugin_id: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    version: str = Field(pattern=r"^\d+\.\d+\.\d+$")
    image: str = Field(pattern=r"^ghcr\.io/[a-z0-9_.-]+/[a-z0-9_./-]+@sha256:[a-f0-9]{64}$")
    signature_bundle: AnyHttpUrl
    permissions: list[str] = Field(max_length=20)
    event_subscriptions: list[str] = Field(max_length=20)
    network_destinations: list[str] = Field(default_factory=list, max_length=10)
    processes_phi: bool = False


@app.post("/v1/plugins/assess")
async def assess_plugin(
    manifest: PluginManifest,
    _: Annotated[Principal, Depends(require_roles("plugin_publisher", "security"))],
):
    prohibited = {"cluster.admin", "secrets.read_all", "tenants.cross_access"}
    failures = sorted(prohibited.intersection(manifest.permissions))
    if manifest.processes_phi and "phi.process" not in manifest.permissions:
        failures.append("PHI processing permission is undeclared")
    if manifest.network_destinations:
        failures.append("external network destinations require security approval")
    return {
        "approved": not failures,
        "blocking_reasons": failures,
        "sandbox": "gvisor",
        "tenant_scoped": True,
    }
