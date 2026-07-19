import base64
import hashlib
import hmac
import json
import time
from typing import Any


class DecentralizedConsentEngine:
    """Implements W3C Verifiable Credentials (VC) concepts for patient consent verification."""

    def __init__(self, consent_verification_key: str) -> None:
        self._verification_key = consent_verification_key

    def issue_consent_token(self, patient_did: str, authorized_service: str, purpose: str, expires_in: int = 3600) -> str:
        """Simulates a patient's decentralized identity wallet issuing a cryptographically signed Consent Token."""
        header = {"alg": "HS256", "typ": "VerifiableCredential"}
        payload = {
            "iss": patient_did,
            "sub": "spiffe://healthgov.local/ns/prod/sa/" + authorized_service,
            "iat": int(time.time()),
            "exp": int(time.time()) + expires_in,
            "vc": {
                "@context": ["https://www.w3.org/2018/credentials/v1", "https://schema.healthgov.local/consent/v1"],
                "type": ["VerifiableCredential", "PatientConsentCredential"],
                "credentialSubject": {
                    "patientDid": patient_did,
                    "authorizedService": authorized_service,
                    "purposeOfUse": purpose,
                    "consentGranted": True
                }
            }
        }
        
        # Encode header and payload
        header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
        payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
        
        # Sign the token
        signing_input = f"{header_b64}.{payload_b64}"
        signature = hmac.new(self._verification_key.encode(), signing_input.encode(), hashlib.sha256).digest()
        signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
        
        return f"{signing_input}.{signature_b64}"

    def verify_consent_token(self, token: str, expected_service: str, expected_purpose: str) -> dict[str, Any]:
        """Verifies the cryptographically signed Consent Token and checks purpose/service constraints."""
        if not token or token.count(".") != 2:
            raise ValueError("Invalid Verifiable Credential token format")
            
        header_b64, payload_b64, signature_b64 = token.split(".")
        
        # Verify signature
        signing_input = f"{header_b64}.{payload_b64}"
        expected_sig = hmac.new(self._verification_key.encode(), signing_input.encode(), hashlib.sha256).digest()
        encoded_expected = base64.urlsafe_b64encode(expected_sig).decode().rstrip("=")
        
        if not hmac.compare_digest(signature_b64, encoded_expected):
            raise ValueError("Consent Token signature verification failed")
            
        # Decode payload
        payload = json.loads(base64.urlsafe_b64decode(payload_b64 + "==").decode())
        
        # Check expiration
        if int(time.time()) > payload.get("exp", 0):
            raise ValueError("Consent Token has expired")
            
        # Verify subject and purpose constraints
        vc = payload.get("vc", {})
        subject = vc.get("credentialSubject", {})
        
        authorized_service = subject.get("authorizedService")
        purpose_of_use = subject.get("purposeOfUse")
        consent_granted = subject.get("consentGranted", False)
        
        if not consent_granted:
            raise ValueError("Consent has been explicitly revoked or not granted")
            
        if authorized_service != expected_service:
            raise ValueError(f"Consent Token is authorized for service '{authorized_service}', but requested by '{expected_service}'")
            
        if purpose_of_use != expected_purpose:
            raise ValueError(f"Consent Token is authorized for purpose '{purpose_of_use}', but requested for '{expected_purpose}'")
            
        return payload
