from fastapi import HTTPException
from typing import Optional, Dict

from app.utils.youtube_utils import get_transcript_with_ytt_api
from app.utils.logger import get_logger
from app.models.response import TranscriptResponse

logger = get_logger(__name__)

class YouTubeService:
    def __init__(self):
        # Initialize any required parameters or configurations here
        pass

    async def process_video(self, youtube_url: str, download: bool, get_transcript: bool) -> Dict:
        video_id = None
        title = None
        transcript_data: Optional[TranscriptResponse] = None
        video_download_status = "Not requested"
        message = "Video processed successfully."
        if get_transcript:
            logger.info(f"Attempting to get transcript for {youtube_url}...")
            transcript_result = get_transcript_with_ytt_api(youtube_url)
            if transcript_result:
                video_id = transcript_result["video_id"]
                title = transcript_result["title"]
                transcript_data = TranscriptResponse(
                    video_id=transcript_result["video_id"],
                    title=transcript_result["title"],
                    formatted_transcript=transcript_result["formatted_transcript"]
                )
                logger.info(f"Transcript fetched for video ID: {video_id}, Title: {title}")
            else:
                logger.warning(f"Failed to get transcript for {youtube_url}.")


        # if download:
        #     logger.info(f"Attempting to download video {youtube_url}...")
        #     if download_video(youtube_url):
        #         video_download_status = "Success"
        #         logger.info(f"Video download successful for {youtube_url}.")
        #     else:
        #         video_download_status = "Failed"
        #         logger.error(f"Video download failed for {youtube_url}.")

        # if not transcript_data and video_download_status == "Failed" and (download or get_transcript):
        #     logger.error(f"Failed to process video: neither transcript nor download succeeded for {youtube_url}.")
        #     raise HTTPException(status_code=500, detail="Failed to process video: neither transcript nor download succeeded.")
        # elif not transcript_data and get_transcript:
        #     message = "Video processed. Transcript could not be fetched. Video download status: " + video_download_status
        #     logger.warning(f"Partial success for {youtube_url}: {message}")
        # elif video_download_status == "Failed" and download:
        #     message = "Video processed. Video download failed. Transcript fetched successfully."
        #     logger.warning(f"Partial success for {youtube_url}: {message}")

        return {
            "message": message,
            "video_id": video_id,
            "title": title,
            "transcript": transcript_data,
            "video_download_status": video_download_status
        }
    
if __name__ == "__main__":
    # Example usage
    service = YouTubeService()
    try:
        result = service.get_transcript_with_ytdlp(
            youtube_url="https://www.youtube.com/watch?v=8S0FDjFBj8o",
            download=False,
            get_transcript=True
        )

    except HTTPException as e:
        logger.error(f"Error processing video: {e.detail}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")

    