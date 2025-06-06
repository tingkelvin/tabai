from fastapi import APIRouter, HTTPException, status, Depends
import logging

from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.request import GoogleVerifyTokenRequest, GoogleAccessTokenRequest
from app.models.response import GoogleVerifyTokenResponse, GoogleUserInfo
from app.core.config import settings
from app.core.security import Security
from app.services.google_auth_service import GoogleAuthService
from app.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter()
bearer_scheme = HTTPBearer()

# Initialize services and security
google_auth_service = GoogleAuthService(google_client_id=settings.GOOGLE_CLIENT_ID)
app_security = Security(secret_key=settings.APP_SECRET_KEY)

@router.post(
    "/google/verify-token",
    response_model=GoogleVerifyTokenResponse,
    summary="Verify Google ID Token for user authentication",
    description="Receives a Google ID Token from the frontend, verifies it, creates or retrieves user info, and returns user info along with an application-specific session token."
)
async def google_verify_id_token_endpoint(request_body: GoogleVerifyTokenRequest):
    if not request_body.id_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID token is required"
        )
    logger.info("Received ID token for verification (token not logged for security).")

    app_user_info = google_auth_service.verify_and_get_user_info(request_body.id_token)
    logger.info(f"User info extracted for: {app_user_info.email}")

    # TODO: Implement your logic here to find or create a user in your database
    # E.g., user_in_db = await find_or_create_user(google_id=app_user_info.id, email=app_user_info.email, name=app_user_info.name, picture=app_user_info.picture)
    # For now, we'll use the info directly from Google for the response.

    app_session_token = app_security.create_session_token(
        user_id=app_user_info.id,
        user_email=app_user_info.email,
        user_name=app_user_info.name
    )

    return GoogleVerifyTokenResponse(
        message="Authentication successful",
        user=app_user_info,
        appSessionToken=app_session_token
    )


@router.post(
    "/google/verify-access-token", 
    response_model=GoogleVerifyTokenResponse,
    summary="Verify Google user info for Chrome extension authentication"
)
async def google_verify_access_token_endpoint(request_body: GoogleAccessTokenRequest):
    if not request_body.access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ID token is required"
        )

    logger.info(f"Received user info for: {request_body.access_token}")


    # Verify the access token with Google
    app_user_info = google_auth_service.verify_access_token_and_get_user_info(request_body.access_token)

    # TODO: Same database logic as your existing endpoint
    # user_in_db = await find_or_create_user(...)
    
    app_session_token = app_security.create_session_token(
        user_id=app_user_info.id,
        user_email=app_user_info.email,
        user_name=app_user_info.name
    )
    
    return GoogleVerifyTokenResponse(
        message="Authentication successful",
        user=app_user_info,
        appSessionToken=app_session_token
    )

# Dependency for protected routes
# This will now expect the token in the 'Authorization: Bearer <token>' header
def get_current_user_payload(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    logger.info(f"Received credentials: {credentials}")
    # credentials.credentials will contain the token string
    token = credentials.credentials
    return app_security.verify_jwt_token(token) # Assuming app_security.verify_jwt_token expects just the token string