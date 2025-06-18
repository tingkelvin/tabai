from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from typing import Optional, List
import base64

from app.models.request import ChatRequest, ChatWithImageRequest, ChatWithSearchRequest
from app.models.response import ChatResponse
from app.core.config import settings
from app.services.llm_service import LlmService, ContentMessage, ImageContent
from app.api.auth import get_current_user_payload # Import the dependency
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Initialize service
llm_service = LlmService(
    gemini_api_key=settings.GEMINI_API_KEY, 
    connect_timeout=settings.LLM_CONNECT_TIMEOUT,
    read_timeout=settings.LLM_READ_TIMEOUT,
    write_timeout=settings.LLM_WRITE_TIMEOUT
)


@router.post("/chat", response_model=ChatResponse, summary="Chat with LLM",
             dependencies=[Depends(get_current_user_payload)])
async def chat_with_llm_endpoint(request: ChatRequest):
    """
    Basic endpoint to send a text message to an LLM (Gemini 2.0 Flash) and get a response.
    """
    logger.info(f"Received basic chat request")
    reply = await llm_service.chat_with_llm(request.message)
    return ChatResponse(reply=reply)


@router.post("/chat/search", response_model=ChatResponse, summary="Chat with LLM and Search",
             dependencies=[Depends(get_current_user_payload)])
async def chat_with_search_endpoint(request: ChatWithSearchRequest):
    """
    Endpoint to chat with LLM with Google Search enabled.
    """
    logger.info(f"Received chat request with search enabled")
    reply = await llm_service.chat_with_search(
        request.message, 
        temperature=request.temperature,
        max_tokens=request.max_tokens
    )
    return ChatResponse(reply=reply)


@router.post("/chat/image", response_model=ChatResponse, summary="Chat with LLM and Image",
             dependencies=[Depends(get_current_user_payload)])
async def chat_with_image_endpoint(request: ChatWithImageRequest):
    """
    Endpoint to send a message with image(s) to the LLM.
    Supports base64 encoded images in the request body.
    """
    logger.info(f"Received chat request with {len(request.images)} image(s)")
    
    try:
        # Convert base64 images to ImageContent objects
        image_contents = []
        for img in request.images:
            image_content = ImageContent.from_base64(img.data, img.mime_type)
            image_contents.append(image_content)
        
        # Create content message
        content = ContentMessage(text=request.message, images=image_contents)
        
        # Send to LLM
        reply = await llm_service.chat_with_llm(
            content, 
            use_search=request.use_search,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        return ChatResponse(reply=reply)
        
    except Exception as e:
        logger.error(f"Error processing image chat request: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error processing images: {str(e)}"
        )


@router.post("/chat/upload", response_model=ChatResponse, summary="Chat with LLM and Upload Image",
             dependencies=[Depends(get_current_user_payload)])
async def chat_with_upload_endpoint(
    message: str = Form(...),
    use_search: bool = Form(False),
    temperature: Optional[float] = Form(0.7),
    max_tokens: Optional[int] = Form(None),
    files: List[UploadFile] = File(...)
):
    """
    Endpoint to upload image files and chat with the LLM.
    Supports multiple image uploads via multipart/form-data.
    """
    logger.info(f"Received chat request with {len(files)} uploaded file(s)")
    
    try:
        # Validate and process uploaded files
        image_contents = []
        allowed_types = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
        
        for file in files:
            if file.content_type not in allowed_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported file type: {file.content_type}. Allowed: {allowed_types}"
                )
            
            # Read file data
            file_data = await file.read()
            if len(file_data) > 10 * 1024 * 1024:  # 10MB limit
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File {file.filename} is too large. Maximum size is 10MB."
                )
            
            image_content = ImageContent(data=file_data, mime_type=file.content_type)
            image_contents.append(image_content)
        
        # Create content message
        content = ContentMessage(text=message, images=image_contents)
        
        # Send to LLM
        reply = await llm_service.chat_with_llm(
            content, 
            use_search=use_search,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return ChatResponse(reply=reply)
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        logger.error(f"Error processing upload chat request: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing uploaded files: {str(e)}"
        )


@router.post("/chat/advanced", response_model=ChatResponse, summary="Advanced Chat with All Features",
             dependencies=[Depends(get_current_user_payload)])
async def advanced_chat_endpoint(
    message: str = Form(...),
    use_search: bool = Form(False),
    temperature: Optional[float] = Form(0.7),
    max_tokens: Optional[int] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    base64_images: Optional[str] = Form(None)  # JSON string of base64 images
):
    """
    Advanced endpoint that supports both uploaded files and base64 images,
    along with optional search functionality.
    """
    logger.info(f"Received advanced chat request")
    
    try:
        image_contents = []
        
        # Process uploaded files
        if files:
            allowed_types = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}
            for file in files:
                if file.content_type not in allowed_types:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Unsupported file type: {file.content_type}"
                    )
                
                file_data = await file.read()
                if len(file_data) > 10 * 1024 * 1024:  # 10MB limit
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"File {file.filename} is too large"
                    )
                
                image_content = ImageContent(data=file_data, mime_type=file.content_type)
                image_contents.append(image_content)
        
        # Process base64 images
        if base64_images:
            import json
            try:
                b64_images = json.loads(base64_images)
                for img_data in b64_images:
                    image_content = ImageContent.from_base64(
                        img_data['data'], 
                        img_data['mime_type']
                    )
                    image_contents.append(image_content)
            except (json.JSONDecodeError, KeyError) as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid base64_images format: {e}"
                )
        
        # Create content
        if image_contents:
            content = ContentMessage(text=message, images=image_contents)
        else:
            content = message
        
        # Send to LLM
        reply = await llm_service.chat_with_llm(
            content, 
            use_search=use_search,
            temperature=temperature,
            max_tokens=max_tokens
        )
        return ChatResponse(reply=reply)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in advanced chat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing request: {str(e)}"
        )


@router.get("/health", summary="Health Check")
async def health_check():
    """
    Health check endpoint for the LLM service.
    """
    try:
        is_healthy = await llm_service.health_check()
        if is_healthy:
            return {"status": "healthy", "service": "llm"}
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="LLM service is unhealthy"
            )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Health check failed"
        )