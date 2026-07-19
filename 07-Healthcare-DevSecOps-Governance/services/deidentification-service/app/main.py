import hashlib
import hmac
import secrets
from datetime import date, timedelta
from typing import Annotated, Any

from fastapi import Depends
from healthgov.config import get_settings
from healthgov.deidentify import safe_harbor
from healthgov.middleware import secure_app
from healthgov.security import Principal, require_roles
from pydantic import BaseModel, Field

app = secure_app("deidentification-service")


class DeidentifyRequest(BaseModel):
    records: list[dict[str, Any]] = Field(max_length=1000)
    method: str = Field(default="safe_harbor", pattern=r"^(safe_harbor|synthetic)$")
    jurisdiction: str = Field(default="US", pattern=r"^(US|UK|EU)$")


def synthetic_record(index: int) -> dict[str, Any]:
    """Generate non-source-derived clinical test data with no real-identity vocabulary."""
    rng = secrets.SystemRandom()
    birth_date = date(1940, 1, 1) + timedelta(days=rng.randrange(25_000))
    return {
        "patient_id": f"SYN-{index:08d}-{secrets.token_hex(4)}",
        "date_of_birth": birth_date.isoformat(),
        "sex_at_birth": rng.choice(["female", "male", "unknown"]),
        "heart_rate": rng.randrange(45, 140),
        "systolic_bp": rng.randrange(85, 190),
        "synthetic": True,
    }


@app.post("/v1/deidentify")
async def deidentify(
    body: DeidentifyRequest,
    principal: Annotated[Principal, Depends(require_roles("privacy_officer", "data_steward"))],
):
    if body.method == "synthetic":
        return {
            "records": [synthetic_record(index) for index in range(len(body.records))],
            "method": "non-source-derived",
            "privacy_evaluation_required": True,
        }
    root = get_settings().tokenization_key
    if not root:
        raise RuntimeError("TOKENIZATION_KEY must be supplied by the secret manager")
    tenant_key = hmac.new(root.encode(), principal.tenant_id.encode(), hashlib.sha256).digest()
    output = [safe_harbor(record, tenant_key, body.jurisdiction) for record in body.records]
    return {"records": output, "method": body.method, "jurisdiction": body.jurisdiction,
            "expert_review_required": True}
