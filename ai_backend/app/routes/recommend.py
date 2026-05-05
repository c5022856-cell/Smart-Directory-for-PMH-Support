from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from app.clients.sqlite_store import SQLiteStore, get_sqlite_store
from app.clients.supabase_rest import SupabaseAPIError, SupabaseRestClient, get_supabase_client
from app.schemas.recommend import (
    RecommendEventsRequest,
    RecommendEventsResponse,
    RecommendServicesRequest,
    RecommendServicesResponse,
)
from app.services.recommender import rank_events, rank_services

router = APIRouter(prefix="/recommend", tags=["recommend"])


@router.post("/services", response_model=RecommendServicesResponse)
def recommend_services(
    request: RecommendServicesRequest,
    store: SQLiteStore = Depends(get_sqlite_store),
) -> RecommendServicesResponse:
    return RecommendServicesResponse(
        items=rank_services(
            store.list_services(),
            request.profile,
            query=request.query,
            support_type=request.support_type,
            limit=request.limit,
        )
    )


@router.post("/events", response_model=RecommendEventsResponse)
def recommend_events(
    request: RecommendEventsRequest,
    store: SQLiteStore = Depends(get_sqlite_store),
) -> RecommendEventsResponse:
    try:
        client = get_supabase_client()
        events = client.list_events()
    except SupabaseAPIError as exc:
        try:
            events = store.list_events()
        except Exception as store_exc:  # pragma: no cover - fallback of fallback
            raise HTTPException(status_code=503, detail=str(exc)) from store_exc

    return RecommendEventsResponse(items=rank_events(events, request.profile, limit=request.limit))
