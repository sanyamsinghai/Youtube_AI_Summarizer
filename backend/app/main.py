from fastapi import FastAPI

import bootstrap  # noqa: F401

from backend.app.routes.summary import router

app = FastAPI()

app.include_router(router)
