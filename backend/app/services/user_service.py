from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.base import User
from app.utils.logger import get_logger

logger = get_logger(__name__)

class UserService:
    def __init__(self, db: Session):
        self.db = db

    def get_user_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_session_token(self, session_token: str) -> User | None:
        return self.db.query(User).filter(User.session_token == session_token).first()

    def create_or_update_user(self, google_id: str, email: str, name: str, picture: str, session_token: str) -> User:
        # Check if user exists
        user = self.get_user_by_email(email)
        
        if user:
            # Update existing user
            user.full_name = name
            user.session_token = session_token
            logger.info(f"Updated existing user: {email}")
        else:
            # Create new user
            user = User(
                email=email,
                full_name=name,
                hashed_password=google_id,  # Using google_id as password since we're using Google auth
                session_token=session_token
            )
            self.db.add(user)
            logger.info(f"Created new user: {email}")

        self.db.commit()
        self.db.refresh(user)
        return user

    def invalidate_session(self, email: str) -> None:
        user = self.get_user_by_email(email)
        if user:
            user.session_token = None
            self.db.commit()
            logger.info(f"Invalidated session for user: {email}") 