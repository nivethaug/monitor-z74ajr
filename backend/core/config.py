"""
Configuration settings for DreamPilot backend.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings."""
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/dreampilot"
    )
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dreampilot-secret-key-change-in-production")
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Project
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "DreamPilot API")

    # Monitoring integration
    LOGIN_TOKEN: str = os.getenv("LOGIN_TOKEN", "")
    MAIN_VPS_URL: str = os.getenv("MAIN_VPS_URL", "")
    WORKER_VPS_URL: str = os.getenv("WORKER_VPS_URL", "")
    MAIN_VPS_TOKEN: str = os.getenv("MAIN_VPS_TOKEN", "")
    WORKER_VPS_TOKEN: str = os.getenv("WORKER_VPS_TOKEN", "")


settings = Settings()
