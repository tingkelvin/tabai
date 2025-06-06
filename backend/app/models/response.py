from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict

class GoogleUserInfo(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    picture: Optional[HttpUrl] = None

class GoogleVerifyTokenResponse(BaseModel):
    message: str
    user: GoogleUserInfo
    appSessionToken: str

class TranscriptResponse(BaseModel):
    video_id: str
    title: str
    formatted_transcript: Dict[str, List[str]] # Adjusted to match the actual output type

class YouTubeProcessResponse(BaseModel):
    message: str
    video_id: Optional[str] = None
    title: Optional[str] = None
    transcript: Optional[TranscriptResponse] = None
    video_download_status: str

class ChatResponse(BaseModel):
    reply: str