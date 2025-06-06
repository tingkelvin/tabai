from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import HTTPException, status

import jwt

class Security:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.algorithm = "HS256"

    def create_session_token(self, user_id: str, user_email: str, user_name: Optional[str] = None) -> str:
        expiration_time = datetime.now(timezone.utc) + timedelta(hours=24)
        payload = {
            "user_id": user_id,
            "email": user_email,
            "name": user_name,
            "exp": expiration_time,
            "iat": datetime.utcnow(),
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def verify_jwt_token(self, token: str) -> dict:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )