from fastapi import APIRouter, Depends
import logging

from app.models.request import YouTubeProcessRequest, ChatRequest
from app.models.response import YouTubeProcessResponse, ChatResponse
from app.core.config import settings
from app.services.youtube_service import YouTubeService
from app.api.auth import get_current_user_payload # Import the dependency
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Initialize service
youtube_service = YouTubeService()

@router.post(
    "/process-youtube-video",
    response_model=YouTubeProcessResponse,
    summary="Process a YouTube video (download and/or get transcript)",
    description="Accepts a YouTube URL and options to download the video file and/or fetch its formatted transcript.",
    dependencies=[Depends(get_current_user_payload)] # Protect this endpoint
)
async def process_youtube_video_endpoint(request: YouTubeProcessRequest):
    """
    Endpoint to process a YouTube video.
    - Downloads the video if `download_video_file` is True.
    - Fetches and formats the transcript if `get_transcript` is True.
    """
    logger.info(f"Received request to process YouTube video: {request.youtube_url}")

    result = await youtube_service.process_video(
        youtube_url=str(request.youtube_url),
        download=request.download_video_file,
        get_transcript=request.get_transcript
    )

    # result = youtube_service.get_transcript_with_ytdlp(request.youtube_url)

    # print(result)

    return YouTubeProcessResponse(**result)