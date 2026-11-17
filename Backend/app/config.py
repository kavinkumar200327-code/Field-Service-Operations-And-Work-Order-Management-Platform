import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="allow")

    PROJECT_NAME: str = "Field Service Operations & Work Order Management Platform"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "super-secret-jwt-key-for-development-change-in-production-min32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "postgresql+psycopg2://postgres@localhost:5432/field_service_ops"
    TEST_DATABASE_URL: str = "postgresql+psycopg2://postgres@localhost:5432/field_service_ops_test"

    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: List[str] = ["jpg", "jpeg", "png", "pdf", "docx"]

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
