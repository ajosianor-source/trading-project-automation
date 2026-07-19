from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "healthgov-data-store"
    environment: str = "development"
    log_level: str = "INFO"
    database_url: str = "postgresql+asyncpg://healthgov:change-me@localhost:5432/healthgov"
    database_pool_size: int = Field(default=10, ge=1, le=100)
    database_max_overflow: int = Field(default=20, ge=0, le=200)
    jwks_url: str = "http://localhost:8080/.well-known/jwks.json"
    jwt_issuer: str = "https://auth.healthgov.local/"
    jwt_audience: str = "healthgov-api"
    tokenization_secret: str = Field(
        default="development-only-change-this-32-byte-secret",
        min_length=32,
    )
    # Production injects a 32-byte base64 key from Vault/KMS. This local value is
    # intentionally non-production and prevents plaintext PHI persistence.
    phi_encryption_key: str = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="
    phi_key_version: str = "local-v1"
    kafka_enabled: bool = False
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_security_protocol: str = "PLAINTEXT"
    kafka_ssl_cafile: str | None = None
    kafka_ssl_certfile: str | None = None
    kafka_ssl_keyfile: str | None = None
    kafka_consumer_group: str = "healthgov-data-store-v1"
    kafka_dlq_topic: str = "clinical.data-store.dlq.v1"
    kafka_max_attempts: int = Field(default=3, ge=1, le=10)


@lru_cache
def get_settings() -> Settings:
    return Settings()
