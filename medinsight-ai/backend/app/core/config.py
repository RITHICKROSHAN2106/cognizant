from pydantic_settings import BaseSettings
from typing import Optional, List
import os


class Settings(BaseSettings):
    # MongoDB Database Settings
    MONGODB_URL: str = "mongodb+srv://Roshan2106:1234@cognizant.mhj2q40.mongodb.net/?appName=Cognizant"
    MONGODB_DB_NAME: str = "medinsight_db"

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
        env_file = ".env"
        extra = "ignore"


settings = Settings()
