from __future__ import annotations

from pydantic import BaseModel, Field


SupportedTranslationLanguage = str


class TranslationInput(BaseModel):
    key: str
    text: str = Field(min_length=1)
    source_language: str = Field(default="en", min_length=2, max_length=8)


class TranslateRequest(BaseModel):
    items: list[TranslationInput] = Field(default_factory=list, min_length=1)
    target_language: str = Field(min_length=2, max_length=8)
    provider_preference: str = Field(default="auto")


class TranslationResult(BaseModel):
    key: str
    source_text: str
    source_language: str
    target_language: str
    translated_text: str
    cached: bool
    provider: str


class TranslateResponse(BaseModel):
    items: list[TranslationResult]
