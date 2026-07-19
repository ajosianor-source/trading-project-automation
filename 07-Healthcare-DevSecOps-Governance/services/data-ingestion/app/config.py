from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    service_name: str = "data-ingestion"
    log_level: str = "INFO"
    jwt_issuer: str = "https://auth.example.health/"
    jwt_audience: str = "healthgov-api"
    jwks_url: str = "https://auth.example.health/.well-known/jwks.json"
    database_url: str = "postgresql+asyncpg://healthgov@localhost/healthgov"
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_enabled: bool = True
    kafka_security_protocol: str = "PLAINTEXT"
    kafka_ssl_cafile: str | None = None
    kafka_ssl_certfile: str | None = None
    kafka_ssl_keyfile: str | None = None
    hapi_fhir_base_url: str = "http://localhost:8080/fhir"
    hapi_fhir_token: str = Field(default="", repr=False)
    tokenization_secret: str = Field(default="", repr=False)
    synthea_output_dir: str = "./data/synthea"
    mimic_data_dir: str = "./data/mimic"
    bidmc_data_dir: str = "./data/bidmc"
    tcia_data_dir: str = "./data/tcia"
    mimic_approval_reference: str = ""
    dicom_quarantine_dir: str = "./data/dicom-quarantine"
    max_upload_bytes: int = 20 * 1024 * 1024
    batch_size: int = 500
    source_poll_seconds: int = 30
    route_timeout_seconds: float = 10
    enable_scheduled_pipelines: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
