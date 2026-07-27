from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os

import bootstrap  # noqa: F401

from backend.app.database import engine, Base
from backend.app.routes.summary import router as summary_router
from backend.app.routes.channels import router as channels_router
from backend.app.routes.chat import router as chat_router
from backend.app.routes.auth import router as auth_router

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "default-dev-secret-key-recap-summarizer"),
    same_site="none",
    https_only=True,
)

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
production_origin = os.getenv("FRONTEND_URL")
if production_origin:
    origins.append(production_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(summary_router)
app.include_router(channels_router)
app.include_router(chat_router)
app.include_router(auth_router)


