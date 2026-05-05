from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.analyze import RiskLevel, UserProfileContext


ChatRole = Literal["user", "assistant"]


class ChatMessage(BaseModel):
    role: ChatRole
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)
    profile: UserProfileContext | None = None


class ChatResponse(BaseModel):
    message: ChatMessage
    risk_level: RiskLevel = "low"
    used_fallback: bool = False
    disclaimer: str | None = None
    sources: list[str] = Field(default_factory=list)
