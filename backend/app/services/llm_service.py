import logging
from google import genai
from google.genai import types
from google.api_core import exceptions as google_exceptions

from fastapi import HTTPException, status
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception,
    before_sleep_log
)

from typing import Optional, Union, List, Dict, Any
from dataclasses import dataclass
import base64
from pathlib import Path

from app.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class ImageContent:
    """Represents image content that can be sent to the LLM."""
    data: bytes
    mime_type: str  # e.g., "image/jpeg", "image/png"
    
    @classmethod
    def from_file(cls, file_path: Union[str, Path]) -> "ImageContent":
        """Create ImageContent from a file path."""
        file_path = Path(file_path)
        
        # Determine MIME type from extension
        mime_type_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        
        suffix = file_path.suffix.lower()
        if suffix not in mime_type_map:
            raise ValueError(f"Unsupported image format: {suffix}")
        
        with open(file_path, 'rb') as f:
            data = f.read()
        
        return cls(data=data, mime_type=mime_type_map[suffix])
    
    @classmethod
    def from_base64(cls, base64_data: str, mime_type: str) -> "ImageContent":
        """Create ImageContent from base64 encoded data."""
        data = base64.b64decode(base64_data)
        return cls(data=data, mime_type=mime_type)


@dataclass
class ContentMessage:
    """Represents a message that can contain text and optional images."""
    text: str
    images: List[ImageContent] = None
    
    def __post_init__(self):
        if self.images is None:
            self.images = []


def is_retryable_genai_error(exception: BaseException) -> bool:
    """Custom predicate to decide if a Google GenAI exception is retryable."""
    # Network and timeout errors
    if isinstance(exception, (
        google_exceptions.DeadlineExceeded,
        google_exceptions.ServiceUnavailable,
        google_exceptions.InternalServerError,
        google_exceptions.ResourceExhausted,  # Rate limiting
    )):
        return True
    
    # Check for specific HTTP status codes if it's a GoogleAPIError
    if isinstance(exception, google_exceptions.GoogleAPIError):
        if hasattr(exception, 'code'):
            return exception.code in [429, 500, 502, 503, 504]
    
    return False


class LlmService:
    def __init__(self, gemini_api_key: str, connect_timeout: float = 30.0, read_timeout: float = 60.0, write_timeout: float = 30.0):
        self.gemini_api_key = gemini_api_key
        self.model_name = "gemini-2.0-flash"
        
        # Initialize the Google GenAI client
        self.client = genai.Client(api_key=self.gemini_api_key)
        
        # Store timeout values for reference
        self.connect_timeout = connect_timeout
        self.read_timeout = read_timeout
        self.write_timeout = write_timeout

    def _prepare_content_parts(self, content: Union[str, ContentMessage]) -> List[Dict[str, Any]]:
        """Convert content to the format expected by the GenAI API."""
        parts = []
        
        if isinstance(content, str):
            # Simple text content
            parts.append({"text": content})
        elif isinstance(content, ContentMessage):
            # Text part
            if content.text:
                parts.append({"text": content.text})
            
            # Image parts
            for image in content.images:
                parts.append({
                    "inline_data": {
                        "mime_type": image.mime_type,
                        "data": base64.b64encode(image.data).decode('utf-8')
                    }
                })
        else:
            raise ValueError(f"Unsupported content type: {type(content)}")
        
        return parts

    def _create_search_tool_config(self) -> Dict[str, Any]:
        """Create configuration for Google Search tool."""
        return {
            "google_search_retrieval": {
                "dynamic_retrieval_config": {
                    "mode": "MODE_DYNAMIC",
                    "dynamic_threshold": 0.7
                }
            }
        }

    @retry(
        stop=stop_after_attempt(3),  # Max 3 attempts (1 initial + 2 retries)
        wait=wait_exponential(multiplier=1, min=1, max=5),  # Wait 1s, then 2s, then 4s (max wait 5s)
        retry=retry_if_exception(is_retryable_genai_error),  # Use our custom predicate
        before_sleep=before_sleep_log(logger, logging.INFO)  # Log before sleeping/retrying
    )
    async def _attempt_llm_chat(
        self, 
        content: Union[str, ContentMessage], 
        config: Optional[types.GenerateContentConfig] = None,
        use_search: bool = False
    ) -> types.GenerateContentResponse:
        """
        A single attempt to call the LLM API using Google GenAI client.
        This method is decorated for retries.
        """
        logger.debug(f"Attempting LLM API call with Google GenAI client")

        try:
            # Prepare content parts
            content_parts = self._prepare_content_parts(content)
            
            # Prepare the request parameters
            request_params = {
                "model": self.model_name,
                "contents": [{"parts": content_parts}]
            }
            
            # Add generation config if provided
            if config:
                request_params["config"] = config
            
            # Add search tool if requested
            if use_search:
                if not config:
                    config = types.GenerateContentConfig()
                
                # Enable search tool
                request_params["config"] = types.GenerateContentConfig(
                    temperature=config.temperature if config else 0.7,
                    top_p=config.top_p if config else 0.9,
                    max_output_tokens=config.max_output_tokens if config else None,
                    candidate_count=config.candidate_count if config else 1,
                    stop_sequences=config.stop_sequences if config else [],
                    tools=[self._create_search_tool_config()]
                )
            
            response = await self.client.aio.models.generate_content(**request_params)
            return response
        except Exception as e:
            logger.error(f"Error in GenAI API call: {e}")
            raise  # Re-raise for retry logic to handle

    async def chat_with_llm(
        self, 
        content: Union[str, ContentMessage], 
        use_search: bool = False,
        **kwargs
    ) -> str:
        """
        Send content to the LLM and get a response.
        
        Args:
            content: The content to send (text string or ContentMessage with images)
            use_search: Whether to enable Google Search tool
            **kwargs: Additional parameters like temperature, max_tokens, etc.
        
        Returns:
            str: The LLM's response text
        """
        content_preview = content if isinstance(content, str) else content.text
        logger.info(f"Sending chat request to LLM with content: {content_preview[:100]}...")

        # Create generation config if custom parameters are provided
        config = None
        if kwargs:
            config = types.GenerateContentConfig(
                temperature=kwargs.get('temperature', 0.7),
                top_p=kwargs.get('top_p', 0.9),
                max_output_tokens=kwargs.get('max_tokens', None),
                candidate_count=1,
                stop_sequences=kwargs.get('stop_sequences', []),
            )

        try:
            response = await self._attempt_llm_chat(content, config, use_search)

            # Extract text from response
            if response.text:
                logger.info(f"LLM responded: {response.text[:100]}...")
                return response.text
            else:
                # Check if response was blocked or had other issues
                if hasattr(response, 'candidates') and response.candidates:
                    candidate = response.candidates[0]
                    if hasattr(candidate, 'finish_reason') and candidate.finish_reason:
                        if candidate.finish_reason.name in ['SAFETY', 'RECITATION']:
                            logger.warning(f"Response blocked: {candidate.finish_reason.name}")
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Content blocked: {candidate.finish_reason.name}"
                            )
                
                logger.error(f"No text in LLM response: {response}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="LLM returned empty response"
                )

        except google_exceptions.InvalidArgument as e:
            logger.error(f"Invalid argument error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid request: {e}"
            )
        except google_exceptions.Unauthenticated as e:
            logger.error(f"Authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key or authentication failed"
            )
        except google_exceptions.PermissionDenied as e:
            logger.error(f"Permission denied: {e}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied - check API key permissions"
            )
        except google_exceptions.ResourceExhausted as e:
            logger.error(f"Rate limit exceeded: {e}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later."
            )
        except google_exceptions.GoogleAPIError as e:
            logger.error(f"Google API error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Google API error: {e}"
            )
        except Exception as e:
            logger.error(f"Unexpected error during LLM chat: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"An unexpected error occurred: {e}"
            )

    async def chat_with_image(
        self, 
        text: str, 
        image_path: Union[str, Path] = None,
        image_data: bytes = None,
        mime_type: str = None,
        use_search: bool = False,
        **kwargs
    ) -> str:
        """
        Convenience method to chat with an image.
        
        Args:
            text: The text message
            image_path: Path to image file (alternative to image_data)
            image_data: Raw image bytes (alternative to image_path)
            mime_type: MIME type (required if using image_data)
            use_search: Whether to enable Google Search tool
            **kwargs: Additional parameters
        
        Returns:
            str: The LLM's response text
        """
        images = []
        
        if image_path:
            images.append(ImageContent.from_file(image_path))
        elif image_data and mime_type:
            images.append(ImageContent(data=image_data, mime_type=mime_type))
        
        content_message = ContentMessage(text=text, images=images)
        return await self.chat_with_llm(content_message, use_search=use_search, **kwargs)

    async def chat_with_search(self, content: Union[str, ContentMessage], **kwargs) -> str:
        """
        Convenience method to chat with Google Search enabled.
        
        Args:
            content: The content to send
            **kwargs: Additional parameters
        
        Returns:
            str: The LLM's response text
        """
        return await self.chat_with_llm(content, use_search=True, **kwargs)

    async def health_check(self) -> bool:
        """
        Perform a health check on the LLM service.
        
        Returns:
            bool: True if service is healthy
        """
        try:
            response = await self.chat_with_llm("Hello", temperature=0.1)
            return bool(response.strip())
        except Exception as e:
            logger.warning(f"Health check failed: {e}")
            return False


# Usage examples:
"""
# Initialize service
llm_service = LlmService(gemini_api_key="your-api-key")

# Simple text chat
response = await llm_service.chat_with_llm("What is the weather like?")

# Chat with search enabled
response = await llm_service.chat_with_search("What are the latest news about AI?")

# Chat with image from file
response = await llm_service.chat_with_image(
    "What do you see in this image?", 
    image_path="path/to/image.jpg"
)

# Chat with image from bytes
with open("image.jpg", "rb") as f:
    image_data = f.read()
response = await llm_service.chat_with_image(
    "Describe this image", 
    image_data=image_data, 
    mime_type="image/jpeg"
)

# Chat with multiple images and search
content = ContentMessage(
    text="Compare these images and search for similar artworks",
    images=[
        ImageContent.from_file("image1.jpg"),
        ImageContent.from_file("image2.png")
    ]
)
response = await llm_service.chat_with_llm(content, use_search=True)

# Chat with image and custom parameters
response = await llm_service.chat_with_image(
    "Analyze this chart",
    image_path="chart.png",
    use_search=True,
    temperature=0.3,
    max_tokens=1000
)
"""