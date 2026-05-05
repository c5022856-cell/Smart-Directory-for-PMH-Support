from __future__ import annotations

from fastapi import APIRouter, Depends

from app.clients.groq_client import GroqClient, get_groq_client
from app.clients.sqlite_store import LocalDatabaseError, SQLiteStore, get_sqlite_store
from app.schemas.analyze import AnalysisResult, AnalyzeInputRequest
from app.services.analyzer import analyze_support_text

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/input", response_model=AnalysisResult)
def analyze_input(
    request: AnalyzeInputRequest,
    store: SQLiteStore = Depends(get_sqlite_store),
    groq_client: GroqClient = Depends(get_groq_client),
) -> AnalysisResult:
    analysis = analyze_support_text(request.text, request.profile, groq_client=groq_client)

    if not request.persist:
        return analysis

    payload = {
        "user_id": str(request.user_id) if request.user_id else None,
        "original_text": request.text,
        "detected_language": analysis.detected_language,
        "motherhood_stage": analysis.motherhood_stage,
        "support_types": analysis.support_types,
        "interaction_preferences": analysis.interaction_preferences,
        "risk_level": analysis.risk_level,
        "keywords": analysis.keywords,
        "summary": analysis.summary,
    }

    try:
        store.insert_support_request(payload)
        analysis.saved = True
    except LocalDatabaseError as exc:
        analysis.storage_error = str(exc)

    return analysis
