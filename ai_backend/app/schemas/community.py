from __future__ import annotations

from pydantic import BaseModel, Field


class CommunityPost(BaseModel):
    id: str
    user_id: str | None = None
    author_name: str | None = None
    content: str
    is_anonymous: bool
    original_language: str = "en"
    status: str = "visible"
    like_count: int = 0
    created_at: str
    updated_at: str


class CreateCommunityPostRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    user_id: str | None = None
    author_name: str | None = None
    is_anonymous: bool = True
    original_language: str = "en"


class UpdateCommunityPostStatusRequest(BaseModel):
    status: str = Field(pattern="^(visible|hidden)$")


class UpdateCommunityPostLikeRequest(BaseModel):
    liked: bool


class ListCommunityPostsResponse(BaseModel):
    items: list[CommunityPost]
