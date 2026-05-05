from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.clients.sqlite_store import LocalDatabaseError, SQLiteStore, get_sqlite_store
from app.schemas.community import (
    CommunityPost,
    CreateCommunityPostRequest,
    ListCommunityPostsResponse,
    UpdateCommunityPostLikeRequest,
    UpdateCommunityPostStatusRequest,
)

router = APIRouter(prefix="/community", tags=["community"])


@router.get("/posts", response_model=ListCommunityPostsResponse)
def list_posts(
    include_hidden: bool = Query(default=False),
    store: SQLiteStore = Depends(get_sqlite_store),
) -> ListCommunityPostsResponse:
    return ListCommunityPostsResponse(items=store.list_community_posts(include_hidden=include_hidden))


@router.post("/posts", response_model=CommunityPost)
def create_post(
    request: CreateCommunityPostRequest,
    store: SQLiteStore = Depends(get_sqlite_store),
) -> CommunityPost:
    try:
        return CommunityPost.model_validate(store.create_community_post(request.model_dump()))
    except LocalDatabaseError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/posts/{post_id}", response_model=CommunityPost)
def update_post_status(
    post_id: str,
    request: UpdateCommunityPostStatusRequest,
    store: SQLiteStore = Depends(get_sqlite_store),
) -> CommunityPost:
    try:
        return CommunityPost.model_validate(store.set_community_post_status(post_id, request.status))
    except LocalDatabaseError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/posts/{post_id}", status_code=204)
def delete_post(post_id: str, store: SQLiteStore = Depends(get_sqlite_store)) -> None:
    try:
        store.delete_community_post(post_id)
    except LocalDatabaseError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/posts/{post_id}/like", response_model=CommunityPost)
def update_post_like(
    post_id: str,
    request: UpdateCommunityPostLikeRequest,
    store: SQLiteStore = Depends(get_sqlite_store),
) -> CommunityPost:
    try:
        return CommunityPost.model_validate(store.adjust_community_post_like_count(post_id, liked=request.liked))
    except LocalDatabaseError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
