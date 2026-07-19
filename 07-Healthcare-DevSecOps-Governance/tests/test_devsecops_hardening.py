
import pytest
from healthgov.consent import DecentralizedConsentEngine
from healthgov.crypto import LocalKMS, PhiProtector, VaultKMS
from healthgov.security import DynamicSecretRotator
from healthgov.service_policies import ServiceMeshSecurity


def test_kms_transit_encryption():
    master_key = b"a" * 32
    local_kms = LocalKMS(master_key)
    
    plaintext = "Sensitive Patient Record"
    context = b"tenant-1"
    
    # Test Local KMS
    ciphertext = local_kms.encrypt_transit(plaintext, context)
    assert ciphertext != plaintext
    decrypted = local_kms.decrypt_transit(ciphertext, context)
    assert decrypted == plaintext

    # Test Vault KMS Simulation
    vault_kms = VaultKMS("http://vault:8200", "s.token123")
    vault_ciphertext = vault_kms.encrypt_transit(plaintext, context)
    assert vault_ciphertext.startswith("vault:v1:")
    vault_decrypted = vault_kms.decrypt_transit(vault_ciphertext, context)
    assert vault_decrypted == plaintext

def test_phi_protector_with_kms():
    master_key = b"a" * 32
    vault_kms = VaultKMS("http://vault:8200", "s.token123")
    protector = PhiProtector(master_key, kms=vault_kms)
    
    plaintext = "John Doe"
    context = b"tenant-1"
    
    encrypted = protector.encrypt(plaintext, context)
    assert encrypted.startswith("vault:v1:")
    decrypted = protector.decrypt(encrypted, context)
    assert decrypted == plaintext

@pytest.mark.asyncio
async def test_dynamic_secret_rotation():
    rotator = DynamicSecretRotator("http://vault:8200", "s.token123", "postgres-role")
    creds = await rotator.get_db_credentials()
    assert "username" in creds
    assert "password" in creds
    assert creds["username"].startswith("v-token-postgres-role-")

def test_service_mesh_mtls_and_authorization():
    mesh = ServiceMeshSecurity("mesh-secret-key-32-bytes-long")
    
    # Generate and verify SPIFFE token
    token = mesh.generate_service_token("data-ingestion")
    assert "spiffe://healthgov.local/ns/prod/sa/data-ingestion" in token
    
    verified_service = mesh.verify_service_token(token)
    assert verified_service == "data-ingestion"
    
    # Test authorization policies
    assert mesh.authorize_communication("data-ingestion", "phi-classifier") is True
    assert mesh.authorize_communication("healthcare-marketplace", "data-store") is False

def test_decentralized_consent_engine():
    engine = DecentralizedConsentEngine("consent-verification-key")
    patient_did = "did:ion:EiD3a...patient"
    
    # Issue consent token
    token = engine.issue_consent_token(
        patient_did=patient_did,
        authorized_service="phi-classifier",
        purpose="clinical-research"
    )
    
    # Verify valid consent token
    payload = engine.verify_consent_token(
        token=token,
        expected_service="phi-classifier",
        expected_purpose="clinical-research"
    )
    assert payload["iss"] == patient_did
    assert payload["vc"]["credentialSubject"]["consentGranted"] is True
    
    # Verify invalid service rejection
    with pytest.raises(ValueError, match="Consent Token is authorized for service"):
        engine.verify_consent_token(
            token=token,
            expected_service="data-store",
            expected_purpose="clinical-research"
        )
        
    # Verify invalid purpose rejection
    with pytest.raises(ValueError, match="Consent Token is authorized for purpose"):
        engine.verify_consent_token(
            token=token,
            expected_service="phi-classifier",
            expected_purpose="marketing"
        )
