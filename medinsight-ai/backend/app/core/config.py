from pydantic_settings import BaseSettings
from typing import Optional, List
import os


class Settings(BaseSettings):
    # MongoDB Database Settings — configure via .env (never hardcode credentials here)
    MONGODB_URI: Optional[str] = None
    MONGODB_DATABASE: str = "medinsight"

    @property
    def mongo_connection_uri(self) -> str:
        """Returns the MongoDB connection URI from environment. Falls back to localhost."""
        return self.MONGODB_URI or "mongodb://localhost:27017"

    @property
    def mongo_db_name(self) -> str:
        """Returns the target MongoDB database name."""
        return self.MONGODB_DATABASE or "medinsight"

    # JWT Authentication
    JWT_SECRET_KEY: str = "your-super-secret-jwt-key-change-in-production-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Machine Learning
    ML_MODEL_PATH: str = "app/ml/artifacts/model.joblib"
    ML_MODEL_TYPE: str = "ensemble"

    # External APIs
    EXTERNAL_API_URL: Optional[str] = "https://api.example-health.com"
    EXTERNAL_API_KEY: Optional[str] = None

    # GenAI / Google Gemini
    GENAI_PROVIDER: str = "gemini"
    GENAI_API_KEY: Optional[str] = None
    GENAI_MODEL: str = "gemini-1.5-flash"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Risk thresholds
    RISK_LOW_MAX: float = 0.30
    RISK_MODERATE_MAX: float = 0.50
    RISK_HIGH_MAX: float = 0.70

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = (".env", "../.env", "../../.env")
        extra = "ignore"


settings = Settings()
