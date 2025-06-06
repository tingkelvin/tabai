from pydantic import BaseModel, HttpUrl
from typing import Optional

class GoogleVerifyTokenRequest(BaseModel):
    id_token: str

class GoogleAccessTokenRequest(BaseModel):
    access_token: str

class YouTubeProcessRequest(BaseModel):
    youtube_url: HttpUrl
    download_video_file: bool = False
    get_transcript: bool = False

class ChatRequest(BaseModel):
    message: str