import hashlib
import hmac
import random
from datetime import date, timedelta
from typing import Any

SAFE_HARBOR_FIELDS = {
    "name",
    "address",
    "email",
    "phone",
    "ssn",
    "mrn",
    "account_number",
    "certificate_number",
    "device_identifier",
    "url",
    "ip_address",
    "biometric_identifier",
    "photo",
}


def safe_harbor(
    record: dict[str, Any], salt: bytes, jurisdiction: str = "US"
) -> dict[str, Any]:
    """HIPAA Safe Harbor baseline; expert determination is still required for edge cases."""
    output: dict[str, Any] = {}
    for key, value in record.items():
        normalized = key.lower()
        if isinstance(value, dict):
            output[key] = safe_harbor(value, salt, jurisdiction)
            continue
        if isinstance(value, list):
            output[key] = [
                safe_harbor(item, salt, jurisdiction) if isinstance(item, dict) else item
                for item in value
            ]
            continue
        if normalized in SAFE_HARBOR_FIELDS:
            output[key] = None
        elif normalized in {"patient_id", "subject_id"}:
            output[key] = hmac.new(salt, str(value).encode(), hashlib.sha256).hexdigest()[:20]
        elif normalized in {"date_of_birth", "dob"}:
            year = int(str(value)[:4])
            output[key] = f"{year}-01-01" if year > date.today().year - 90 else "90+"
        elif normalized in {"zip", "postal_code"}:
            # US Safe Harbor permits only validated three-digit ZIP groupings. Other
            # jurisdictions default to full suppression pending a configured policy.
            output[key] = f"{str(value)[:3]}00" if jurisdiction.upper() == "US" else None
        else:
            output[key] = value
    return output


def deterministic_date_shift(value: date, subject_token: str, max_days: int = 30) -> date:
    seed = int(hashlib.sha256(subject_token.encode()).hexdigest()[:8], 16)
    offset = random.Random(seed).randint(-max_days, max_days)  # noqa: S311
    return value + timedelta(days=offset)
