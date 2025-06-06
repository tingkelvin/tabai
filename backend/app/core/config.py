import os

from pydantic import HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from dotenv import load_dotenv

load_dotenv()
app_env = os.getenv("APP_ENV", "dev")

class Settings(BaseSettings):

    PROJECT_NAME: str = "Tubetor API"

    # Database settings
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/tubetor_db"

    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: HttpUrl # Ensure HttpUrl is imported if used here

    if app_env == 'dev':
        BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    if app_env == 'prod':
        BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:4173", "https://tubetor.uc.r.appspot.com", "https://tubetor.xyz", "http://tubetor.xyz", "www.tubetor.xyz", "tubetor.xyz"]

    APP_SECRET_KEY: str
    GEMINI_API_KEY: str

    LLM_CONNECT_TIMEOUT: float = 5.0
    LLM_READ_TIMEOUT: float = 60.0
    LLM_WRITE_TIMEOUT: float = 10.0

    model_config = SettingsConfigDict(env_file=f'.env.{app_env}', extra='ignore')

settings = Settings()