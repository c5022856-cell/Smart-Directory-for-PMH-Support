from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.analyze import RiskLevel, UserProfileContext


class RecommendationContext(UserProfileContext):
    risk_level: RiskLevel = "low"
    keywords: list[str] = Field(default_factory=list)


class RecommendServicesRequest(BaseModel):
    profile: RecommendationContext | None = None
    query: str | None = None
    support_type: str | None = None
    limit: int = Field(default=12, ge=1, le=50)


class ServiceRecommendation(BaseModel):
    id: str
    name: str
    description: str | None = None
    support_type: str
    languages: list[str] = Field(default_factory=list)
    delivery_modes: list[str] = Field(default_factory=list)
    motherhood_stages: list[str] = Field(default_factory=list)
    support_tags: list[str] = Field(default_factory=list)
    location: str | None = None
    distance_label: str | None = None
    availability: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    address: str | None = None
    rating: float | None = None
    review_count: int | None = None
    crisis_capable: bool = False
    score: float
    recommendation_reason: str | None = None
    is_recommended: bool


class RecommendServicesResponse(BaseModel):
    items: list[ServiceRecommendation]


class RecommendEventsRequest(BaseModel):
    profile: RecommendationContext | None = None
    limit: int = Field(default=6, ge=1, le=20)


class EventRecommendation(BaseModel):
    id: str
    title: str
    topic: str
    description: str | None = None
    language: str
    event_date: str
    mode: str
    location: str | None = None
    score: float
    recommendation_reason: str | None = None


class RecommendEventsResponse(BaseModel):
    items: list[EventRecommendation]
