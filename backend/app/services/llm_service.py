import httpx
import logging

from fastapi import HTTPException, status
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    retry_if_exception, # For custom predicate
    before_sleep_log
)

from typing import Optional, Dict, List

from app.utils.youtube_utils import download_video, get_transcript_with_ytt_api
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Define general retryable HTTPX exceptions
RETRYABLE_HTTPX_NETWORK_EXCEPTIONS = (
    httpx.TimeoutException,  # Includes ConnectTimeout, ReadTimeout, WriteTimeout
    httpx.ConnectError,
    httpx.NetworkError,      # Base class for network-related issues
    httpx.PoolTimeout,       # If using connection pooling and it times out
)

def is_retryable_llm_api_error(exception: BaseException) -> bool:
    """Custom predicate to decide if an exception from LLM API is retryable."""
    if isinstance(exception, RETRYABLE_HTTPX_NETWORK_EXCEPTIONS):
        return True
    if isinstance(exception, httpx.HTTPStatusError):
        # Retry on specific server-side errors or rate limiting
        return exception.response.status_code in [
            status.HTTP_429_TOO_MANY_REQUESTS, # Rate limit
            status.HTTP_500_INTERNAL_SERVER_ERROR, # General server error from LLM
            status.HTTP_502_BAD_GATEWAY,
            status.HTTP_503_SERVICE_UNAVAILABLE,
            status.HTTP_504_GATEWAY_TIMEOUT,
        ]
    return False

class LlmService:
    def __init__(self, gemini_api_key: str, connect_timeout: float, read_timeout: float, write_timeout: float):
        self.gemini_api_key = gemini_api_key
        self.gemini_api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        self.request_timeouts = httpx.Timeout(connect_timeout, read=read_timeout, write=write_timeout)

    @retry(
        stop=stop_after_attempt(3),  # Max 3 attempts (1 initial + 2 retries)
        wait=wait_exponential(multiplier=1, min=1, max=5),  # Wait 1s, then 2s, then 4s (max wait 5s between retries)
        retry=retry_if_exception(is_retryable_llm_api_error), # Use our custom predicate
        before_sleep=before_sleep_log(logger, logging.INFO)  # Log before sleeping/retrying
    )
    async def _attempt_llm_chat(self, api_url_with_key: str, payload: dict) -> dict:
        """
        A single attempt to call the LLM API. This method is decorated for retries.
        It should raise the original httpx exceptions if an error occurs.
        """
        logger.debug(f"Attempting LLM API call to {self.gemini_api_url}")
        async with httpx.AsyncClient(timeout=self.request_timeouts) as client:
            response = await client.post(
                api_url_with_key,
                headers={'Content-Type': 'application/json'},
                json=payload
            )
            response.raise_for_status()  # Raises httpx.HTTPStatusError for 4xx/5xx
        return response.json()
    
    async def chat_with_llm(self, message: str) -> str:
        logger.info(f"Sending chat request to LLM with message: {message}")

        chat_history = []
        chat_history.append({"role": "user", "parts": [{"text": message}]})
        payload = {"contents": chat_history}
        api_url_with_key = f"{self.gemini_api_url}?key={self.gemini_api_key}"

        try:
            result = await self._attempt_llm_chat(api_url_with_key, payload)

            if result.get("candidates") and result["candidates"][0].get("content") and result["candidates"][0]["content"].get("parts"):
                llm_response_text = result["candidates"][0]["content"]["parts"][0]["text"]
                logger.info(f"LLM responded: {llm_response_text}")
                return llm_response_text
            else:
                logger.error(f"Unexpected LLM response structure: {result}")
                raise HTTPException(status_code=500, detail="Unexpected LLM response structure from LLM API.")

        except httpx.RequestError as e:
            logger.error(f"HTTPX request error to LLM API: {e}")
            raise HTTPException(status_code=500, detail=f"Could not connect to LLM API: {e}")
        except Exception as e:
            logger.error(f"An unexpected error occurred during LLM chat: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"An error occurred during chat: {e}")