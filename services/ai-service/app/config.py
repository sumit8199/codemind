from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    PORT: int = 8000
    INTERNAL_SERVICE_TOKEN: str = "dev_internal_service_token_codemind_secret_key_64bit"
    AI_PROVIDER: str = "mock"
    AI_MODEL: str = "mock-agent-v1"
    AI_API_KEY: Optional[str] = None
    AGENT_TIMEOUT_SECONDS: int = 30
    MAX_AGENT_RETRIES: int = 1
    LOG_LEVEL: str = "info"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
