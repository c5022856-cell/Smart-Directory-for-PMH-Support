from __future__ import annotations

from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field


RiskLevel = Literal["low", "medium", "high", "urgent"]
SupportedLanguage = Literal["en", "ar", "pl", "hi", "ta", "ur"]
MotherhoodStage = Literal["pregnant", "postpartum", "supporter"]
SupportType = Literal["emotional", "practical", "clinical", "peer", "crisis"]
InteractionPreference = Literal["inperson", "online", "phone", "message", "email", "social"]


class UserProfileContext(BaseModel):
    motherhood_stage: str | None = None
    support_types: list[str] = Field(default_factory=list)
    interaction_preferences: list[str] = Field(default_factory=list)
    preferred_language: str | None = None


class AnalyzeInputRequest(BaseModel):
    text: str = Field(min_length=5, max_length=2000)
    user_id: UUID | None = None
    profile: UserProfileContext | None = None
    persist: bool = True


class AnalysisResult(BaseModel):
    detected_language: SupportedLanguage | str
    motherhood_stage: str | None = None
    support_types: list[str] = Field(default_factory=list)
    interaction_preferences: list[str] = Field(default_factory=list)
    risk_level: RiskLevel = "low"
    keywords: list[str] = Field(default_factory=list)
    summary: str
    requires_crisis_action: bool = False
    crisis_guidance: str | None = None
    saved: bool = False
    storage_error: str | None = None


class LLMAnalysisPayload(BaseModel):
    detected_language: SupportedLanguage
    motherhood_stage: MotherhoodStage | None = None
    support_types: list[SupportType] = Field(default_factory=list)
    interaction_preferences: list[InteractionPreference] = Field(default_factory=list)
    risk_level: RiskLevel = "low"
    keywords: list[str] = Field(default_factory=list)
    summary: str
