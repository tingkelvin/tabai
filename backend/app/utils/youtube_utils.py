import logging
import os
import re
import requests
import yt_dlp

from collections import defaultdict
from typing import Dict, List, Optional, Any
from urllib.parse import urlparse, parse_qs

from fastapi import HTTPException
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig

from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
    VideoUnavailable,
    YouTubeTranscriptApi, 
    FetchedTranscript, 
    FetchedTranscriptSnippet,
    VideoUnplayable
)

import requests.exceptions

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)

logger = logging.getLogger(__name__)
ytt_api = YouTubeTranscriptApi()

# --- Define Custom Service-Level Exceptions ---
class TranscriptServiceError(Exception):
    """Base exception for this service."""
    pass

class VideoIdExtractionError(TranscriptServiceError):
    """Failed to extract video ID."""
    pass

class TranscriptUnavailableError(TranscriptServiceError):
    """Transcript is not available (e.g., disabled, not found, video unavailable)."""
    pass

class TranscriptProcessingError(TranscriptServiceError):
    """Error during transcript processing or formatting."""
    pass

class ExternalDependencyError(TranscriptServiceError):
    """Error related to an external dependency like the YouTube Transcript API itself."""
    pass


# --- Retry Configuration ---
# Define retryable exceptions from youtube_transcript_api or underlying requests
RETRYABLE_TRANSCRIPT_EXCEPTIONS = (
    requests.exceptions.Timeout,
    requests.exceptions.ConnectionError,
    requests.exceptions.ProxyError,
    TranscriptProcessingError,
    TranscriptUnavailableError
    # Add other specific requests exceptions if needed
)

ytt_api = YouTubeTranscriptApi()

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=1, max=5),
    retry=retry_if_exception_type(RETRYABLE_TRANSCRIPT_EXCEPTIONS),
    before_sleep=before_sleep_log(logger, logging.INFO, exc_info=True)
)
def _fetch_transcript_with_retry(video_id: str, languages: List[str] = ['en']) -> List[Dict[str, Any]]:
    ytt_api = YouTubeTranscriptApi(
        proxy_config=WebshareProxyConfig(
            proxy_username="ydsjfewjgfgsss",
            proxy_password="x7pyt9xk7zrh",
        )
    )
    """
    Internal function to fetch transcript with retry logic.
    Raises exceptions from youtube_transcript_api directly if they occur after retries.
    """
    logger.debug(f"Attempting to fetch transcript for video ID: {video_id}, languages: {languages}")
    # This call can raise TranscriptsDisabled, NoTranscriptFound, VideoUnavailable, TooManyRequests etc.
    transcript_list = ytt_api.fetch(video_id, languages=languages)
    return transcript_list

def ms_to_timestamp(ms: int) -> str:
    """Converts milliseconds to a human-readable timestamp (HH:MM:SS.mmm)."""
    seconds, ms = divmod(ms, 1000)
    minutes, seconds = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    return f"{hours:02}:{minutes:02}:{seconds:02}.{ms:03}"

def format_transcript(raw_transcript: FetchedTranscript) -> Dict[str, List[str]]:
    """
    Formats the raw transcript into a dictionary with timestamps as keys
    and lists of transcript segments as values.
    
    Args:
        raw_transcript: List of transcript segments from YouTube Transcript API
        
    Returns:
        Dictionary with timestamp strings as keys and text segments as values
    """
    if not raw_transcript:
        logger.warning("Empty transcript received")
        return {}

    formatted_data: Dict[str, List[str]] = defaultdict(list)
 
    for entry in raw_transcript:
        # Ensure entry has required fields
        if not isinstance(entry, FetchedTranscriptSnippet):
            logger.warning(f"Invalid entry type: {type(entry)}, expected FetchedTranscriptSnippet")
            continue
        entry: FetchedTranscriptSnippet
        
        text = entry.text
        start_time = entry.start
        
        # Skip empty text or auto-generated captions markers
        if not text or text.startswith("["):
            continue
            
        if start_time is not None:
            # Convert start time to integer seconds for consistent grouping
            timestamp_key = str(int(start_time))
            formatted_data[timestamp_key].append(text)
        else:
            logger.warning(f"Missing start time in entry: {entry}")
                
        # except Exception as e:
        #     logger.error(f"Error processing transcript entry {entry}: {e}")
        #     continue
        
    return dict(formatted_data)  # Convert defaultdict to regular dict

def extract_youtube_video_id(url: str) -> Optional[str]:
    """
    Extracts the 11-character video ID from various YouTube URL formats.

    Args:
        url: The YouTube vide o URL as a string.

    Returns:
        The 11-character video ID string, or None if not found.
    """
    if not url:
        return None
    logger.debug(f"Extracting video ID from URL: {url}")

    # Regex pattern to match various YouTube video URL formats
    # This pattern captures the 11-character video ID.
    # It covers:
    # - Standard watch URLs: youtube.com/watch?v=VIDEO_ID
    # - Shortened youtu.be URLs: youtu.be/VIDEO_ID
    # - Embed URLs: youtube.com/embed/VIDEO_ID, youtube.com/v/VIDEO_ID
    # - URLs with additional parameters (e.g., &list=, &t=)
    # - Handles both http and https
    youtube_regex = (
        r'(?:youtube\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/)'
        r'([^"&?/ ]{11})'
    )

    match = re.search(youtube_regex, url)

    if match:
        return match.group(1) # The first capturing group is the video ID
    else:
        # Fallback for URLs where regex might fail or if it's a slightly unusual format
        # This uses urllib.parse which is robust for query parameters.
        parsed_url = urlparse(url)

        # Check query parameters for 'v' (standard video ID)
        if parsed_url.query:
            query_params = parse_qs(parsed_url.query)
            if 'v' in query_params and query_params['v']:
                video_id = query_params['v'][0]
                if re.match(r'^[a-zA-Z0-9_-]{11}$', video_id): # Validate 11-char ID
                    return video_id

        # Check path for youtu.be or embed formats where ID is directly in path
        path_segments = parsed_url.path.strip('/').split('/')
        if len(path_segments) > 0:
            last_segment = path_segments[-1]
            if re.match(r'^[a-zA-Z0-9_-]{11}$', last_segment): # Validate 11-char ID
                return last_segment
    raise HTTPException(
        status_code=400,
        detail=f"Invalid YouTube URL format: {url}. Could not extract video ID."
    )


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=5),
    retry=retry_if_exception_type(RETRYABLE_TRANSCRIPT_EXCEPTIONS),
    before_sleep=before_sleep_log(logger, logging.INFO, exc_info=True)
)
def get_transcript_with_ytt_api(youtube_url: str) -> Dict[str, Any]: # Changed Optional[Dict] to Dict, will raise on failure
    """
    Fetches and formats an English transcript for a YouTube video using youtube-transcript-api.

    Returns:
        A dictionary containing video_id, title (placeholder), and formatted_transcript.

    Raises:
        VideoIdExtractionError: If the video ID cannot be extracted.
        TranscriptUnavailableError: If transcripts are disabled, not found, or video is unavailable.
        ExternalDependencyError: For issues like too many requests or network problems with the API.
        TranscriptProcessingError: For errors during the formatting of the transcript.
        TranscriptServiceError: For other unexpected errors within the service.
    """
    try:
        logger.info(f"Starting transcript fetch for URL: {youtube_url}")
        video_id = extract_youtube_video_id(youtube_url)



        if not video_id:
            logger.error(f"Could not extract video ID from URL: {youtube_url}")
            raise VideoIdExtractionError(f"Could not extract video ID from URL: {youtube_url}")
        
        logger.debug(f"Extracted video ID: {video_id} for URL: {youtube_url}")
        
        raw_transcript_segments = _fetch_transcript_with_retry(video_id, languages=['en'])
        formatted_transcript = format_transcript(raw_transcript_segments)
    
        return {
            "video_id": video_id,
            "title": "", # Placeholder - fetching title is a separate concern
            "formatted_transcript": formatted_transcript
        }

    except requests.exceptions.ProxyError as e:
        logger.error(f"Proxy error fetching transcript for video ID {video_id}: {type(e).__name__}")
        raise ExternalDependencyError(f"Proxy error while fetching transcript for {video_id}")
    except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable, VideoUnplayable) as e:
        logger.warning(f"Transcript unavailable for video ID {video_id} (URL: {youtube_url}): {type(e).__name__}")
        raise TranscriptUnavailableError(f"Transcript not available for video ID {video_id}: {e}") from e
    except requests.exceptions.RequestException as e: # Catch underlying network errors if not handled by retry or ytt_api
        logger.error(f"Network error fetching transcript for video ID {video_id}: {type(e).__name__}")
        raise ExternalDependencyError(f"Network error while fetching transcript for {video_id}: {e}") from e
    except Exception as e: # Catch any other unexpected errors (e.g. from format_transcript)
        logger.error(f"Error processing transcript for video ID {video_id} (URL: {youtube_url}): {e}", exc_info=True)
        # Check if it's an error from our formatting or something else
        if isinstance(e, (VideoIdExtractionError, TranscriptUnavailableError, ExternalDependencyError)):
            raise # Re-raise if it's one of our already specific exceptions
        raise TranscriptProcessingError(f"Failed to process transcript for {video_id}: {str(e)}") from e


def download_video(youtube_url: str) -> bool:
    """
    Downloads a YouTube video to the 'downloads' directory.
    Returns True on success, False on failure.
    """
    output_path = os.path.join("downloads", "%(title)s.%(ext)s")
    ydl_opts = {
        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4',
        'outtmpl': output_path,
        'noplaylist': True,
        'progress_hooks': [lambda d: logger.info(d['status']) if d['status'] == 'finished' else None],
        'quiet': True,
        'no_warnings': True,
    }

    # Ensure the downloads directory exists
    os.makedirs("downloads", exist_ok=True)

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([youtube_url])
        return True
    except yt_dlp.DownloadError as e:
        logger.error(f"Failed to download video {youtube_url}: {e}")
        return False
    except Exception as e:
        logger.error(f"An unexpected error occurred during video download for {youtube_url}: {e}", exc_info=True)
        return False
    
def format_transcript_ytdlp(json_data):
    """
    Formats raw JSON transcript data into a dictionary where keys are
    timestamp strings and values are lists of text segments starting at that timestamp.
    Each line within a segment (separated by '\n') becomes a separate item in the list.
    """
    transcript_dict = {}

    for event in json_data.get("events", []):
        if "segs" in event:
            timestamp_str = str(event["tStartMs"] / 1000.0)
            raw_text = "".join(seg.get("utf8", "") for seg in event["segs"])
            # Split by newline, strip each line, and filter out empty lines
            lines = [line.strip() for line in raw_text.split('\n') if line.strip()]

            if lines:
                if timestamp_str not in transcript_dict:
                    transcript_dict[timestamp_str] = []
                transcript_dict[timestamp_str].extend(lines)

    return transcript_dict

def get_transcript_with_ytdlp(youtube_url):
    """
    Fetches and formats English subtitles/captions for a given YouTube URL.
    Saves the raw JSON subtitle file and updates an ID-to-title mapping.
    Returns a dictionary containing video_id, title, and formatted_transcript, or None on failure.
    """
    ydl_opts = {
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['en'],
        'skip_download': True,
        'subtitlesformat': 'json3',
        'quiet': True,
        'no_warnings': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info(f"Extracting info for transcript from {youtube_url}...")
            info = ydl.extract_info(youtube_url, download=False)
            video_id = info.get('id')
            title = info.get('title')
            # print(info)

            subs = info.get('subtitles') or {}
            auto_subs = info.get('automatic_captions') or {}
            selected_subs = subs.get('en') or auto_subs.get('en')

            if not selected_subs:
                logger.warning(f"No English subtitles found for {youtube_url}.")
                return None

            json3_subtitle_url = None
            for sub in selected_subs:
                if sub['ext'] == 'json3':
                    json3_subtitle_url = sub['url']
                    break

            if not json3_subtitle_url:
                logger.warning(f"No .json3 subtitle format found for {youtube_url}.")
                return None

            response = requests.get(json3_subtitle_url)
            response.raise_for_status()

            raw_json_data = response.json()

            formatted_transcript = format_transcript_ytdlp(raw_json_data)
            # print(formatted_transcript)

            return {
                "video_id": video_id,
                "title": title,
                "formatted_transcript": formatted_transcript
            }
    except yt_dlp.utils.DownloadError as e:
        logger.error(f"yt-dlp error for {youtube_url}: {e}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error downloading subtitles for {youtube_url}: {e}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error for subtitles from {youtube_url}: {e}")
        return None
    except Exception as e:
        logger.critical(f"An unexpected critical error occurred for {youtube_url}: {e}", exc_info=True)
        return None