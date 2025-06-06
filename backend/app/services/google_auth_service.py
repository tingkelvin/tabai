from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from fastapi import HTTPException, status
import logging

import requests

from app.models.response import GoogleUserInfo
from app.utils.logger import get_logger

logger = get_logger(__name__)

class GoogleAuthService:
    def __init__(self, google_client_id: str):
        self.google_client_id = google_client_id

    def verify_and_get_user_info(self, id_token: str) -> GoogleUserInfo:
        try:
            decoded_id_token = google_id_token.verify_oauth2_token(
                id_token,
                google_requests.Request(),
                self.google_client_id
            )
            logger.info("Google ID token verified successfully.")

            user_id = decoded_id_token.get("sub")
            user_email = decoded_id_token.get("email")
            user_name = decoded_id_token.get("name")
            user_picture = decoded_id_token.get("picture")

            if not user_id or not user_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Incomplete user information in token"
                )

            return GoogleUserInfo(
                id=user_id,
                email=user_email,
                name=user_name,
                picture=user_picture
            )

        except ValueError as e:
            logger.error(f"Google ID token verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Google ID token: {e}"
            )
        except Exception as e:
            logger.error(f"Unexpected error during Google token verification: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication processing failed due to an unexpected error."
            )
        
    def verify_access_token_and_get_user_info(self, access_token: str) -> GoogleUserInfo:
        """Verify Google access token and extract user info (for Chrome extensions)"""
        try:
            # Call Google's userinfo endpoint to verify access token and get user data
            response = requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10
            )
            
            if not response.ok:
                logger.error(f"Google userinfo API returned status {response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired access token"
                )
            
            user_data = response.json()
            logger.info("Google access token verified successfully via userinfo API.")
            
            user_id = user_data.get("id")
            user_email = user_data.get("email")
            user_name = user_data.get("name")
            user_picture = user_data.get("picture")
            
            if not user_id or not user_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Incomplete user information from Google"
                )
            
            return GoogleUserInfo(
                id=user_id,
                email=user_email,
                name=user_name,
                picture=user_picture
            )
            
        except requests.RequestException as e:
            logger.error(f"Failed to call Google userinfo API: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to verify token with Google services"
            )
        except Exception as e:
            logger.error(f"Unexpected error during access token verification: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Authentication processing failed due to an unexpected error."
            )