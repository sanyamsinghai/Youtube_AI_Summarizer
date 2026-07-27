from fastapi import Request, Depends
from sqlalchemy.orm import Session
from backend.app.database import get_db

def get_current_user_id(request: Request, db: Session = Depends(get_db)) -> str:
    user_id = request.session.get("user_id")
    return user_id if user_id else "guest"
