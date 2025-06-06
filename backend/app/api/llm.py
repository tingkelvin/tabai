from fastapi import APIRouter, Depends

from app.models.request import ChatRequest
from app.models.response import ChatResponse
from app.core.config import settings
from app.services.llm_service import LlmService
from app.api.auth import get_current_user_payload # Import the dependency
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Initialize service
llm_service = LlmService(gemini_api_key=settings.GEMINI_API_KEY, 
                            connect_timeout=settings.LLM_CONNECT_TIMEOUT,
                            read_timeout=settings.LLM_READ_TIMEOUT,
                            write_timeout=settings.LLM_WRITE_TIMEOUT)

@router.post("/chat-with-llm", response_model=ChatResponse, summary="Chat with LLM",
             dependencies=[Depends(get_current_user_payload)]) # Protect this endpoint
async def chat_with_llm_endpoint(request: ChatRequest):
    """
    Endpoint to send a message to an LLM (Gemini 2.0 Flash) and get a response.
    """
    logger.info(f"Received chat request (message not logged for security).")
    reply = await llm_service.chat_with_llm(request.message)
    return ChatResponse(reply=reply)