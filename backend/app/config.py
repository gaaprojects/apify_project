from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://realestate:realestate_password@localhost:5432/czech_realestate"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # ML
    ml_model_path: str = "./ml/models"

    # API
    api_v1_prefix: str = "/api/v1"
    project_name: str = "Czech Real Estate Analyzer"

    # CORS - configurable via environment variable
    # Can be set as comma-separated list: CORS_ORIGINS="http://localhost:3000,http://example.com"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Price assessment thresholds
    price_below_market_threshold: float = -0.10  # -10%
    price_above_market_threshold: float = 0.10   # +10%

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string to list."""
        if self.cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
