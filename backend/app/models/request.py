from pydantic import BaseModel, Field, validator
import base64
from typing import Optional, List

class GoogleVerifyTokenRequest(BaseModel):
    id_token: str

class GoogleAccessTokenRequest(BaseModel):
    access_token: str

class ChatRequest(BaseModel):
    """Basic chat request with text message only."""
    message: str = Field(..., description="The message to send to the LLM", min_length=1)


class ChatWithSearchRequest(BaseModel):
    """Chat request with search functionality enabled."""
    message: str = Field(..., description="The message to send to the LLM", min_length=1)
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(None, gt=0, description="Maximum tokens to generate")


class ImageData(BaseModel):
    """Represents image data in base64 format."""
    data: str = Field(..., description="Base64 encoded image data")
    mime_type: str = Field(..., description="MIME type of the image (e.g., 'image/jpeg')")
    
    @validator('mime_type')
    def validate_mime_type(cls, v):
        allowed_types = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
        if v not in allowed_types:
            raise ValueError(f"Invalid MIME type. Allowed: {allowed_types}")
        return v
    
    @validator('data')
    def validate_base64(cls, v):
        try:
            # Try to decode to validate it's proper base64
            decoded = base64.b64decode(v)
            # Basic validation - check if it's not empty
            if len(decoded) == 0:
                raise ValueError("Empty image data")
            # Optional: Add size limit (e.g., 10MB)
            if len(decoded) > 10 * 1024 * 1024:
                raise ValueError("Image too large (max 10MB)")
        except Exception as e:
            raise ValueError(f"Invalid base64 data: {e}")
        return v


class ChatWithImageRequest(BaseModel):
    """Chat request with image(s) support."""
    message: str = Field(..., description="The message to send to the LLM", min_length=1)
    images: List[ImageData] = Field(..., description="List of images to send", min_items=1)
    use_search: bool = Field(False, description="Whether to enable Google Search")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(None, gt=0, description="Maximum tokens to generate")
    
    @validator('images')
    def validate_images_count(cls, v):
        if len(v) > 5:  # Reasonable limit
            raise ValueError("Maximum 5 images allowed per request")
        return v


class ChatAdvancedRequest(BaseModel):
    """Advanced chat request supporting all features."""
    message: str = Field(..., description="The message to send to the LLM", min_length=1)
    images: Optional[List[ImageData]] = Field(None, description="List of base64 images")
    use_search: bool = Field(False, description="Whether to enable Google Search")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(None, gt=0, description="Maximum tokens to generate")
    stop_sequences: Optional[List[str]] = Field(None, description="List of stop sequences")
    
    @validator('images')
    def validate_images_count(cls, v):
        if v and len(v) > 5:
            raise ValueError("Maximum 5 images allowed per request")
        return v
    
    @validator('stop_sequences')
    def validate_stop_sequences(cls, v):
        if v and len(v) > 10:
            raise ValueError("Maximum 10 stop sequences allowed")
        return v