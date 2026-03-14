"""Application configuration from environment variables."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """FaceLipa backend settings."""

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    snippe_api_key: str = ""
    tembo_account_id: str = ""
    tembo_secret_key: str = ""
    tembo_hash_key: str = ""
    tembo_sandbox: bool = True
    payment_provider: str = "snippe"
    webhook_base_url: str = ""
    briq_api_key: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
