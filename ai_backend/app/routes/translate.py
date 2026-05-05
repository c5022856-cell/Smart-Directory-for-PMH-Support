from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.clients.groq_client import GroqClient, get_groq_client
from app.clients.sqlite_store import SQLiteStore, get_sqlite_store
from app.schemas.translate import TranslateRequest, TranslateResponse
from app.services.translator import translate_items

router = APIRouter(prefix="/translate", tags=["translate"])


@router.post("", response_model=TranslateResponse)
def translate(
    request: TranslateRequest,
    store: SQLiteStore = Depends(get_sqlite_store),
    groq_client: GroqClient = Depends(get_groq_client),
) -> TranslateResponse:
    try:
        return TranslateResponse(
            items=translate_items(
                items=request.items,
                target_language=request.target_language,
                store=store,
                groq_client=groq_client,
                provider_preference=request.provider_preference,
            )
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
