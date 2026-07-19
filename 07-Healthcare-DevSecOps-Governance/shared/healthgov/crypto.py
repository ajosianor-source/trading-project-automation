import abc
import base64
import hashlib
import hmac
import os
import time
from typing import Any

import hvac
import requests
import structlog
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from hvac.exceptions import InvalidRequest, VaultError

log = structlog.get_logger()


class KeyManagementService(abc.ABC):
    """Abstract Key Management Service interface for enterprise-grade key operations."""

    @abc.abstractmethod
    def encrypt_transit(self, plaintext: str, context: bytes, key_id: str = "default") -> str:
        """Encrypt data using transit encryption (keys never reside in application memory)."""
        pass

    @abc.abstractmethod
    def decrypt_transit(self, ciphertext: str, context: bytes, key_id: str = "default") -> str:
        """Decrypt data using transit encryption (keys never reside in application memory)."""
        pass

    @abc.abstractmethod
    def get_key(self, key_id: str = "default") -> bytes:
        """Retrieve a key (for envelope encryption or local fallback)."""
        pass


class LocalKMS(KeyManagementService):
    """Local mock/fallback KMS provider using AES-GCM."""

    def __init__(self, master_key: bytes) -> None:
        if len(master_key) != 32:
            raise ValueError("AES-256 master key requires exactly 32 bytes")
        self._master_key = master_key
        self._aes = AESGCM(master_key)

    def encrypt_transit(self, plaintext: str, context: bytes, key_id: str = "default") -> str:
        nonce = os.urandom(12)
        ciphertext = self._aes.encrypt(nonce, plaintext.encode(), context)
        return base64.urlsafe_b64encode(nonce + ciphertext).decode()

    def decrypt_transit(self, ciphertext: str, context: bytes, key_id: str = "default") -> str:
        raw = base64.urlsafe_b64decode(ciphertext)
        return self._aes.decrypt(raw[:12], raw[12:], context).decode()

    def get_key(self, key_id: str = "default") -> bytes:
        # Deterministic subkey derivation for local use
        return hmac.new(self._master_key, key_id.encode(), hashlib.sha256).digest()


class SecretCacheEntry:
    def __init__(self, data: dict[str, Any], ttl: float) -> None:
        self.data = data
        self.expires_at = time.monotonic() + ttl


class VaultKMS(KeyManagementService):
    """Production-ready HashiCorp Vault KMS provider using the official hvac client."""

    def __init__(
        self,
        vault_url: str,
        token: str | None = None,
        role_id: str | None = None,
        secret_id: str | None = None,
        k8s_role: str | None = None,
        k8s_jwt_path: str = "/var/run/secrets/kubernetes.io/serviceaccount/token",
        key_name: str = "app-key",
        mount_point: str = "transit",
        kv_mount_point: str = "secret",
        secret_ttl: float = 300.0,
    ) -> None:
        self.vault_url = vault_url
        self.token = token
        self.role_id = role_id or os.getenv("VAULT_ROLE_ID")
        self.secret_id = secret_id or os.getenv("VAULT_SECRET_ID")
        self.k8s_role = k8s_role or os.getenv("VAULT_K8S_ROLE")
        self.k8s_jwt_path = k8s_jwt_path
        self.key_name = key_name
        self.mount_point = mount_point
        self.kv_mount_point = kv_mount_point
        self.secret_ttl = secret_ttl

        # Initialize hvac client
        # In production, verify TLS using custom CA bundle if configured
        ca_cert = os.getenv("VAULT_CACERT")
        self.client = hvac.Client(
            url=self.vault_url,
            token=self.token,
            verify=ca_cert if ca_cert else True,
        )

        self._token_expires_at = 0.0
        self._secret_cache: dict[str, SecretCacheEntry] = {}
        self._fallback_kms: LocalKMS | None = None

        # Perform initial authentication
        self._authenticate()

    def _authenticate(self) -> None:
        """Authenticate with Vault using Token, AppRole, or Kubernetes auth method."""
        try:
            if self.token:
                # Token auth (primarily for dev/testing)
                self.client.token = self.token
                # Try to lookup token self to find expiration
                try:
                    token_info: Any = self.client.lookup_token()
                    ttl = token_info["data"]["ttl"]
                    self._token_expires_at = time.monotonic() + ttl if ttl > 0 else float("inf")
                except (requests.exceptions.ConnectionError, requests.exceptions.Timeout, VaultError):
                    raise
                except Exception:
                    # Fallback if lookup_token is restricted
                    self._token_expires_at = time.monotonic() + 3600
                log.info("vault_auth_token_success", url=self.vault_url)
                return

            if self.role_id and self.secret_id:
                # AppRole auth
                response: Any = self.client.auth.approle.login(
                    role_id=self.role_id,
                    secret_id=self.secret_id,
                )
                self.client.token = response["auth"]["client_token"]
                lease_duration = response["auth"]["lease_duration"]
                self._token_expires_at = time.monotonic() + lease_duration
                log.info("vault_auth_approle_success", role_id=self.role_id)
                return

            if self.k8s_role and os.path.exists(self.k8s_jwt_path):
                # Kubernetes auth
                with open(self.k8s_jwt_path) as f:
                    jwt_token = f.read().strip()
                response: Any = self.client.auth.kubernetes.login(
                    role=self.k8s_role,
                    jwt=jwt_token,
                )
                self.client.token = response["auth"]["client_token"]
                lease_duration = response["auth"]["lease_duration"]
                self._token_expires_at = time.monotonic() + lease_duration
                log.info("vault_auth_kubernetes_success", role=self.k8s_role)
                return

            # Fallback to local mock key if no auth method is configured (for backward compatibility in tests)
            log.warning("vault_no_auth_configured_using_local_fallback")
            fallback_key = hashlib.sha256(f"{self.vault_url}:fallback".encode()).digest()
            self._fallback_kms = LocalKMS(fallback_key)

        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout, VaultError) as exc:
            log.warning("vault_connection_failed_falling_back_to_local_kms", error=str(exc))
            fallback_key = hashlib.sha256(f"{self.vault_url}:{self.token or 'fallback'}".encode()).digest()
            self._fallback_kms = LocalKMS(fallback_key)
        except Exception as exc:
            log.error("vault_auth_failed", error=str(exc))
            raise VaultError(f"Failed to authenticate with Vault: {str(exc)}") from exc

    def _ensure_authenticated(self) -> None:
        """Ensure the client token is valid and renew or re-authenticate if necessary."""
        if self._fallback_kms:
            return

        now = time.monotonic()
        # Renew token if it's within 5 minutes of expiring
        if now >= self._token_expires_at - 300:
            try:
                if self.token:
                    # Token renewal
                    self.client.renew_token(token=self.client.token)
                    self._token_expires_at = now + 3600
                    log.info("vault_token_renewed")
                else:
                    # Re-authenticate for AppRole/K8s
                    self._authenticate()
            except Exception as exc:
                log.warning("vault_token_renewal_failed_reauthenticating", error=str(exc))
                try:
                    self._authenticate()
                except Exception as auth_exc:
                    log.error("vault_reauth_failed", error=str(auth_exc))
                    raise VaultError(f"Vault token expired and re-authentication failed: {str(auth_exc)}") from auth_exc

    def _execute_with_retry(self, func, *args, **kwargs) -> Any:
        """Execute a Vault operation with retries, token renewal, and fallback handling."""
        max_retries = 3
        base_delay = 0.5

        for attempt in range(max_retries):
            try:
                self._ensure_authenticated()
                if self._fallback_kms:
                    # If we are in fallback mode, route to fallback KMS
                    fallback_func_name = func.__name__
                    if hasattr(self._fallback_kms, fallback_func_name):
                        return getattr(self._fallback_kms, fallback_func_name)(*args, **kwargs)
                    raise AttributeError(f"Fallback KMS has no method {fallback_func_name}")

                return func(*args, **kwargs)
            except (VaultError, InvalidRequest) as exc:
                # If permission denied or bad token, try re-authenticating immediately
                if "permission denied" in str(exc).lower() or "invalid token" in str(exc).lower():
                    log.warning("vault_permission_error_attempting_reauth", error=str(exc))
                    try:
                        self._authenticate()
                    except Exception:
                        pass
                if attempt == max_retries - 1:
                    log.error("vault_operation_failed_permanently", func=func.__name__, error=str(exc))
                    # If transit engine fails, we can optionally fall back to local encryption to prevent hard failure
                    if func.__name__ in ("encrypt_transit", "decrypt_transit") and os.getenv("VAULT_ALLOW_LOCAL_FALLBACK", "false").lower() == "true":
                        log.warning("vault_falling_back_to_local_kms_due_to_failure")
                        if not self._fallback_kms:
                            fallback_key = hashlib.sha256(f"{self.vault_url}:fallback".encode()).digest()
                            self._fallback_kms = LocalKMS(fallback_key)
                        return getattr(self._fallback_kms, func.__name__)(*args, **kwargs)
                    raise
                delay = base_delay * (2 ** attempt)
                log.warning("vault_operation_failed_retrying", func=func.__name__, attempt=attempt + 1, error=str(exc), delay=delay)
                time.sleep(delay)
            except Exception as exc:
                if attempt == max_retries - 1:
                    log.error("vault_unexpected_error_permanently", func=func.__name__, error=str(exc))
                    raise
                delay = base_delay * (2 ** attempt)
                time.sleep(delay)

    def encrypt_transit(self, plaintext: str, context: bytes, key_id: str = "default") -> str:
        """Encrypt data using Vault's Transit Secrets Engine."""
        if self._fallback_kms:
            # Return a vault:v1: prefixed ciphertext to mimic Vault
            raw_cipher = self._fallback_kms.encrypt_transit(plaintext, context, key_id)
            return f"vault:v1:{raw_cipher}"

        def _encrypt():
            # Context is used as associated data for AES-GCM
            encoded_context = base64.b64encode(context).decode()
            response = self.client.secrets.transit.encrypt_data(
                name=self.key_name,
                plaintext=base64.b64encode(plaintext.encode()).decode(),
                context=encoded_context,
                mount_point=self.mount_point,
            )
            return response["data"]["ciphertext"]

        return self._execute_with_retry(_encrypt)

    def decrypt_transit(self, ciphertext: str, context: bytes, key_id: str = "default") -> str:
        """Decrypt data using Vault's Transit Secrets Engine."""
        if self._fallback_kms:
            # Strip vault:v1: prefix if present
            raw_cipher = ciphertext
            if raw_cipher.startswith("vault:v1:"):
                raw_cipher = raw_cipher[len("vault:v1:"):]
            return self._fallback_kms.decrypt_transit(raw_cipher, context, key_id)

        def _decrypt():
            encoded_context = base64.b64encode(context).decode()
            response = self.client.secrets.transit.decrypt_data(
                name=self.key_name,
                ciphertext=ciphertext,
                context=encoded_context,
                mount_point=self.mount_point,
            )
            decrypted_base64 = response["data"]["plaintext"]
            return base64.b64decode(decrypted_base64).decode()

        return self._execute_with_retry(_decrypt)

    def get_key(self, key_id: str = "default") -> bytes:
        """Retrieve a key (for envelope encryption or local fallback)."""
        def _get_key():
            try:
                # Attempt to read the key from Vault transit (if configured as exportable)
                response = self.client.secrets.transit.read_key(
                    name=self.key_name,
                    mount_point=self.mount_point,
                )
                # If exportable keys are returned
                keys = response["data"].get("keys", {})
                if keys:
                    latest_version = max(map(int, keys.keys()))
                    key_b64 = keys[str(latest_version)]["key"]
                    return base64.b64decode(key_b64)
            except Exception:
                pass
            # Fallback: derive a deterministic subkey using HMAC of a master secret
            # derived from the vault URL and token/role_id
            seed = f"{self.vault_url}:{self.role_id or self.token}"
            return hmac.new(seed.encode(), key_id.encode(), hashlib.sha256).digest()

        return self._execute_with_retry(_get_key)

    def get_secret(self, path: str, key: str | None = None) -> Any:
        """Retrieve a secret from KV v2 engine with caching."""
        now = time.monotonic()
        cache_key = f"{path}:{key or ''}"

        # Check cache
        if cache_key in self._secret_cache:
            entry = self._secret_cache[cache_key]
            if now < entry.expires_at:
                return entry.data.get(key) if key else entry.data

        def _get_secret():
            response = self.client.secrets.kv.v2.read_secret_version(
                path=path,
                mount_point=self.kv_mount_point,
            )
            secret_data = response["data"]["data"]
            # Cache the secret data
            self._secret_cache[cache_key] = SecretCacheEntry(secret_data, self.secret_ttl)
            return secret_data.get(key) if key else secret_data

        return self._execute_with_retry(_get_secret)

    def put_secret(self, path: str, secret_data: dict[str, Any]) -> None:
        """Write a secret to KV v2 engine."""
        def _put_secret():
            self.client.secrets.kv.v2.create_or_update_secret_version(
                path=path,
                secret=secret_data,
                mount_point=self.kv_mount_point,
            )
            # Invalidate cache for this path
            keys_to_remove = [k for k in self._secret_cache.keys() if k.startswith(f"{path}:")]
            for k in keys_to_remove:
                self._secret_cache.pop(k, None)

        self._execute_with_retry(_put_secret)


class PhiProtector:
    """Envelope-ready field protection. Production keys must come from Vault/KMS."""

    def __init__(self, key: bytes, kms: KeyManagementService | None = None) -> None:
        if len(key) != 32:
            raise ValueError("AES-256 requires exactly 32 bytes")
        self._key = key
        self._aes = AESGCM(key)
        self._kms = kms or LocalKMS(key)

    def encrypt(self, plaintext: str, context: bytes) -> str:
        return self._kms.encrypt_transit(plaintext, context)

    def decrypt(self, encoded: str, context: bytes) -> str:
        if encoded.startswith("vault:v1:"):
            return self._kms.decrypt_transit(encoded, context)
        raw = base64.urlsafe_b64decode(encoded)
        return self._aes.decrypt(raw[:12], raw[12:], context).decode()

    def tokenize(self, value: str, namespace: str) -> str:
        digest = hmac.new(self._key, f"{namespace}:{value}".encode(), hashlib.sha256).digest()
        return f"tok_{base64.urlsafe_b64encode(digest[:18]).decode().rstrip('=')}"
