import base64
import hashlib
import hmac

# Centralized Service Authorization Policies
# Defines which services are allowed to communicate with each other.
SERVICE_COMMUNICATION_POLICIES: dict[str, set[str]] = {
    "phi-classifier": {"data-ingestion", "deidentification-service"},
    "deidentification-service": {"data-ingestion", "data-store"},
    "data-store": {"data-ingestion", "deidentification-service", "tenant-service"},
    "tenant-service": {"local-auth-bff", "data-store"},
    "healthcare-marketplace": {"local-auth-bff"},  # Blocked from touching data-store directly
}

class ServiceMeshSecurity:
    """Simulates SPIFFE/SPIRE-like service identity and mTLS verification at the application layer."""

    def __init__(self, mesh_secret: str) -> None:
        self._mesh_secret = mesh_secret

    def generate_service_token(self, service_name: str) -> str:
        """Generates a cryptographically signed SPIFFE-like Service Identity Token."""
        spiffe_id = f"spiffe://healthgov.local/ns/prod/sa/{service_name}"
        signature = hmac.new(self._mesh_secret.encode(), spiffe_id.encode(), hashlib.sha256).digest()
        encoded_sig = base64.urlsafe_b64encode(signature).decode().rstrip("=")
        return f"{spiffe_id}.{encoded_sig}"

    def verify_service_token(self, token: str) -> str:
        """Verifies the SPIFFE-like Service Identity Token and returns the verified service name."""
        if not token or "." not in token:
            raise ValueError("Invalid service token format")
        # Split from the right to handle potential dots in the SPIFFE ID
        spiffe_id, signature = token.rsplit(".", 1)
        expected_sig = hmac.new(self._mesh_secret.encode(), spiffe_id.encode(), hashlib.sha256).digest()
        encoded_expected = base64.urlsafe_b64encode(expected_sig).decode().rstrip("=")
        if not hmac.compare_digest(signature, encoded_expected):
            raise ValueError("Service identity signature verification failed")
        
        # Extract service name from SPIFFE ID
        prefix = "spiffe://healthgov.local/ns/prod/sa/"
        if not spiffe_id.startswith(prefix):
            raise ValueError("Invalid SPIFFE ID namespace")
        return spiffe_id[len(prefix):]

    def authorize_communication(self, source_service: str, target_service: str) -> bool:
        """Checks if the source service is authorized to communicate with the target service."""
        allowed_sources = SERVICE_COMMUNICATION_POLICIES.get(target_service, set())
        return source_service in allowed_sources
