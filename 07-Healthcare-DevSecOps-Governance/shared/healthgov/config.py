from functools import lru_cache

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    log_level: str = "INFO"
    jwt_issuer: str = "https://auth.example.health/"
    jwt_audience: str = "healthgov-api"
    jwks_url: AnyHttpUrl = "https://auth.example.health/.well-known/jwks.json"
    jwks_cache_seconds: int = Field(default=300, ge=30, le=3600)
    database_url: str = Field(default="postgresql+asyncpg://healthgov@postgres/healthgov")
    redis_url: str = "redis://redis:6379/0"
    opa_url: AnyHttpUrl = "http://opa:8181"
    audit_service_url: AnyHttpUrl = "http://audit-service:8000"
    kafka_bootstrap_servers: str = "kafka:9093"
    kafka_security_protocol: str = "SSL"
    smart_issuer: str = "https://ehr.example.health"
    smart_audience: str = "healthgov-fhir"
    tokenization_key: str = Field(default="", repr=False)
    iomt_signature_key: str = Field(default="", repr=False)


@lru_cache
def get_settings() -> Settings:
    return Settings()
