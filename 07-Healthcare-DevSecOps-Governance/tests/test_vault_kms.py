import base64
from unittest.mock import MagicMock, patch

import requests
from healthgov.crypto import VaultKMS


@patch("hvac.Client")
def test_vault_kms_token_auth(mock_client_class):
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client
    mock_client.lookup_token.return_value = {"data": {"ttl": 3600}}

    kms = VaultKMS(vault_url="http://localhost:8200", token="s.test-token")

    assert kms.token == "s.test-token"
    mock_client.lookup_token.assert_called_once()


@patch("hvac.Client")
def test_vault_kms_approle_auth(mock_client_class):
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client
    mock_client.auth.approle.login.return_value = {
        "auth": {
            "client_token": "s.approle-token",
            "lease_duration": 1800,
        }
    }

    kms = VaultKMS(
        vault_url="http://localhost:8200",
        role_id="test-role-id",
        secret_id="test-secret-id",
    )

    assert kms.client.token == "s.approle-token"
    mock_client.auth.approle.login.assert_called_once_with(
        role_id="test-role-id",
        secret_id="test-secret-id",
    )


@patch("hvac.Client")
@patch("os.path.exists")
@patch("builtins.open")
def test_vault_kms_kubernetes_auth(mock_open, mock_exists, mock_client_class):
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client
    mock_exists.return_value = True
    mock_open.return_value.__enter__.return_value.read.return_value = "mock-jwt-token"
    mock_client.auth.kubernetes.login.return_value = {
        "auth": {
            "client_token": "s.k8s-token",
            "lease_duration": 3600,
        }
    }

    kms = VaultKMS(
        vault_url="http://localhost:8200",
        k8s_role="test-k8s-role",
    )

    assert kms.client.token == "s.k8s-token"
    mock_client.auth.kubernetes.login.assert_called_once_with(
        role="test-k8s-role",
        jwt="mock-jwt-token",
    )


@patch("hvac.Client")
def test_vault_kms_transit_operations(mock_client_class):
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client
    mock_client.lookup_token.return_value = {"data": {"ttl": 3600}}
    
    # Mock encrypt_data
    mock_client.secrets.transit.encrypt_data.return_value = {
        "data": {"ciphertext": "vault:v1:encrypted-data"}
    }
    # Mock decrypt_data
    mock_client.secrets.transit.decrypt_data.return_value = {
        "data": {"plaintext": base64.b64encode(b"Sensitive Patient Record").decode()}
    }

    kms = VaultKMS(vault_url="http://localhost:8200", token="s.test-token", key_name="test-key")

    ciphertext = kms.encrypt_transit("Sensitive Patient Record", context=b"tenant-1")
    assert ciphertext == "vault:v1:encrypted-data"
    mock_client.secrets.transit.encrypt_data.assert_called_once_with(
        name="test-key",
        plaintext=base64.b64encode(b"Sensitive Patient Record").decode(),
        context=base64.b64encode(b"tenant-1").decode(),
        mount_point="transit",
    )

    plaintext = kms.decrypt_transit("vault:v1:encrypted-data", context=b"tenant-1")
    assert plaintext == "Sensitive Patient Record"
    mock_client.secrets.transit.decrypt_data.assert_called_once_with(
        name="test-key",
        ciphertext="vault:v1:encrypted-data",
        context=base64.b64encode(b"tenant-1").decode(),
        mount_point="transit",
    )


@patch("hvac.Client")
def test_vault_kms_kv_secrets_with_caching(mock_client_class):
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client
    mock_client.lookup_token.return_value = {"data": {"ttl": 3600}}
    
    # Mock read_secret_version
    mock_client.secrets.kv.v2.read_secret_version.return_value = {
        "data": {
            "data": {
                "api_key": "super-secret-key",
                "db_password": "secure-password",
            }
        }
    }

    kms = VaultKMS(vault_url="http://localhost:8200", token="s.test-token", secret_ttl=10.0)

    # First read (should call Vault)
    secret = kms.get_secret("database/config", "db_password")
    assert secret == "secure-password"
    mock_client.secrets.kv.v2.read_secret_version.assert_called_once_with(
        path="database/config",
        mount_point="secret",
    )

    # Second read (should hit cache, no additional Vault call)
    secret_cached = kms.get_secret("database/config", "db_password")
    assert secret_cached == "secure-password"
    assert mock_client.secrets.kv.v2.read_secret_version.call_count == 1


@patch("hvac.Client")
def test_vault_kms_connection_failure_fallback(mock_client_class):
    # Mock connection error on lookup_token
    mock_client = MagicMock()
    mock_client_class.return_value = mock_client
    mock_client.lookup_token.side_effect = requests.exceptions.ConnectionError("Connection refused")

    kms = VaultKMS(vault_url="http://localhost:8200", token="s.test-token")

    # Should fall back to LocalKMS
    assert kms._fallback_kms is not None
    
    # Operations should work using local fallback and return vault:v1: prefixed ciphertexts
    ciphertext = kms.encrypt_transit("Sensitive Patient Record", context=b"tenant-1")
    assert ciphertext.startswith("vault:v1:")
    
    plaintext = kms.decrypt_transit(ciphertext, context=b"tenant-1")
    assert plaintext == "Sensitive Patient Record"
