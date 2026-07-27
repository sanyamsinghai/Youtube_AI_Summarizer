import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth

import json
from backend.app.database import get_db
from backend.app.models import User, Summary

router = APIRouter()

oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile"
    }
)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


@router.get("/auth/google/login")
async def login(request: Request):
    redirect_uri = f"{BACKEND_URL}/auth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/auth/google/callback")
async def callback(request: Request, db: Session = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google authentication failed: {str(e)}")

    userinfo = token.get("userinfo")
    if not userinfo:
        raise HTTPException(status_code=400, detail="Failed to retrieve user info from Google.")

    sub = userinfo.get("sub")
    email = userinfo.get("email")
    name = userinfo.get("name")

    if not sub or not email:
        raise HTTPException(status_code=400, detail="Incomplete user profile returned by Google.")

    # Find or create user
    user = db.query(User).filter(User.id == sub).first()
    if not user:
        user = User(id=sub, email=email, name=name)
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update user name or email if it changed in Google
        updated = False
        if user.email != email:
            user.email = email
            updated = True
        if user.name != name:
            user.name = name
            updated = True
        if updated:
            db.commit()

    # Store ONLY user_id in the session cookie (don't store secrets/access tokens)
    request.session["user_id"] = user.id

    return RedirectResponse(url=FRONTEND_URL)


@router.get("/auth/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url=FRONTEND_URL)


@router.get("/auth/me")
def get_me(request: Request, db: Session = Depends(get_db)):
    user_id = request.session.get("user_id")
    if not user_id:
        return {"logged_in": False}

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"logged_in": False}

    return {
        "logged_in": True,
        "email": user.email,
        "name": user.name
    }


@router.get("/auth/me/summaries")
def get_my_summaries(request: Request, db: Session = Depends(get_db)):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    db_summaries = db.query(Summary).filter(Summary.user_id == user_id).order_by(Summary.created_at.desc()).all()

    response_summaries = []
    for s in db_summaries:
        try:
            summary_data = json.loads(s.summary_content)
        except Exception:
            summary_data = s.summary_content

        response_summaries.append({
            "id": s.id,
            "video_id": s.video_id,
            "title": s.title,
            "summary": summary_data,
            "style": s.style,
            "created_at": s.created_at.isoformat()
        })

    return response_summaries




