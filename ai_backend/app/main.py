from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware

from app.clients.sqlite_store import get_sqlite_store
from app.config import get_settings
from app.routes.analyze import router as analyze_router
from app.routes.chat import router as chat_router
from app.routes.community import router as community_router
from app.routes.health import router as health_router
from app.routes.recommend import router as recommend_router
from app.routes.translate import router as translate_router

settings = get_settings()
logger = logging.getLogger("matria.ai")

app = FastAPI(
    title="MATRIA AI Backend",
    version="0.1.0",
    description="Recommendation, analysis, and translation support services for MATRIA.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(analyze_router)
app.include_router(recommend_router)
app.include_router(chat_router)
app.include_router(translate_router)
app.include_router(community_router)


@app.on_event("startup")
def initialize_local_database() -> None:
    get_sqlite_store()


@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    logger.info("%s %s -> %s", request.method, request.url.path, response.status_code)
    return response


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "matria-ai-backend",
        "docs": "/docs",
    }
