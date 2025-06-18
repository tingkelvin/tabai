from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import logging

from app.core.config import settings
from app.api import auth, llm
from app.utils.logger import setup_logging, get_logger

# Setup logging before anything else
setup_logging(log_file="app.log", level=logging.INFO)
logger = get_logger(__name__)

load_dotenv()  # Load environment variables from .env file

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API to download YouTube videos and fetch their transcripts.",
    version="1.0.0",
)

print(settings.BACKEND_CORS_ORIGINS)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(llm.router, tags=["Llm Processing"])

# Example of a root endpoint (optional)
@app.get("/")
async def read_root():
    logger.info("Root endpoint accessed.")
    return {"message": "Welcome to the Taber API!"}