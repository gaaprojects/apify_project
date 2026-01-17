from pydantic_settings import BaseSettings
from functools import lru_cache


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

    # Price assessment thresholds
    price_below_market_threshold: float = -0.10  # -10%
    price_above_market_threshold: float = 0.10   # +10%

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
