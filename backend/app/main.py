from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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

env = os.getenv("ENV", "development").lower()
is_prod = env == "production"

app = FastAPI()

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "default-dev-secret-key-recap-summarizer"),
    same_site=os.getenv("SESSION_SAME_SITE", "lax"),
    https_only=is_prod or os.getenv("SESSION_HTTPS_ONLY", "False").lower() == "true",
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

# Mount SPA static build files in production (or when built dist folder is present)
# Ensure this is registered AFTER API routers so it doesn't hijack API routes.
FRONTEND_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

if os.path.exists(FRONTEND_DIST_DIR):
    assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{catchall:path}")
    async def serve_spa(request: Request, catchall: str):
        # Serve any static file in dist (e.g. favicon.ico, robots.txt) if it exists
        file_path = os.path.join(FRONTEND_DIST_DIR, catchall)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        # Otherwise fall back to index.html for client-side SPA routing
        index_path = os.path.join(FRONTEND_DIST_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"message": "Welcome to Recap API (index.html not found)"}



