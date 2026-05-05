from __future__ import annotations

import json
from functools import lru_cache

import httpx

from app.config import get_settings
from app.schemas.analyze import AnalysisResult, LLMAnalysisPayload, UserProfileContext
from app.schemas.chat import ChatMessage


class GroqAPIError(RuntimeError):
    """Raised when the Groq API request fails."""


ANALYSIS_JSON_SCHEMA = {
    "name": "support_input_analysis",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "detected_language": {"type": "string", "enum": ["en", "ar", "pl", "hi", "ta", "ur"]},
            "motherhood_stage": {"type": ["string", "null"], "enum": ["pregnant", "postpartum", "supporter", None]},
            "support_types": {
                "type": "array",
                "items": {"type": "string", "enum": ["emotional", "practical", "clinical", "peer", "crisis"]},
                "uniqueItems": True,
            },
            "interaction_preferences": {
                "type": "array",
                "items": {"type": "string", "enum": ["inperson", "online", "phone", "message", "email", "social"]},
                "uniqueItems": True,
            },
            "risk_level": {"type": "string", "enum": ["low", "medium", "high", "urgent"]},
            "keywords": {"type": "array", "items": {"type": "string"}, "uniqueItems": True},
            "summary": {"type": "string"},
        },
        "required": [
            "detected_language",
            "motherhood_stage",
            "support_types",
            "interaction_preferences",
            "risk_level",
            "keywords",
            "summary",
        ],
    },
}


class GroqClient:
    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.groq_api_key
        self._model = settings.groq_model or "openai/gpt-oss-20b"
        self._base_url = settings.groq_api_base.rstrip("/")
        self._timeout = settings.request_timeout_seconds

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key)

    def _post_chat_completion(self, payload: dict) -> dict:
        if not self._api_key:
            raise GroqAPIError("GROQ_API_KEY is not configured.")

        with httpx.Client(timeout=self._timeout) as client:
            response = client.post(
                f"{self._base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

        if not response.is_success:
            raise GroqAPIError(f"Groq request failed: {response.status_code} {response.text}")

        return response.json()

    @staticmethod
    def _extract_message_text(payload: dict) -> str:
        try:
            content = payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise GroqAPIError(f"Groq response parsing failed: {exc}") from exc

        if isinstance(content, str):
            return content.strip()

        if isinstance(content, list):
            text_parts: list[str] = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    text_parts.append(str(item.get("text", "")))
            text = "".join(text_parts).strip()
            if text:
                return text

        raise GroqAPIError("Groq response did not contain text content.")

    @staticmethod
    def _finish_reason(payload: dict) -> str | None:
        try:
            return payload["choices"][0].get("finish_reason")
        except (KeyError, IndexError, AttributeError):
            return None

    def analyze_support_text(self, text: str, profile: UserProfileContext | None = None) -> LLMAnalysisPayload:
        profile_hint = (
            f"preferred_language={profile.preferred_language!r}, "
            f"motherhood_stage={profile.motherhood_stage!r}, "
            f"support_types={profile.support_types!r}, "
            f"interaction_preferences={profile.interaction_preferences!r}"
            if profile
            else "none"
        )

        prompt = (
            "You are extracting structured directory-search metadata for a perinatal mental health platform. "
            "You must stay non-diagnostic and classify only the directory or resource request. "
            "Return strict JSON that matches the provided schema. "
            "Use only these categories: motherhood_stage = pregnant|postpartum|supporter|null; "
            "support_types = emotional|practical|clinical|peer|crisis; "
            "interaction_preferences = inperson|online|phone|message|email|social; "
            "risk_level = low|medium|high|urgent. "
            "If self-harm, harm to baby, or immediate danger is implied, set risk_level to urgent and include crisis. "
            f"Profile hints: {profile_hint}. "
            f"User text: {text}"
        )

        payload = {
            "model": self._model,
            "temperature": 0,
            "messages": [
                {
                    "role": "system",
                    "content": "Extract safe structured support metadata. Respond only with JSON.",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": ANALYSIS_JSON_SCHEMA,
            },
        }

        try:
            raw_content = self._post_chat_completion(payload)["choices"][0]["message"]["content"]
            parsed = json.loads(raw_content)
            return LLMAnalysisPayload.model_validate(parsed)
        except (KeyError, IndexError, ValueError) as exc:
            raise GroqAPIError(f"Groq response parsing failed: {exc}") from exc

    def generate_support_reply(
        self,
        *,
        messages: list[ChatMessage],
        profile: UserProfileContext | None = None,
        analysis: AnalysisResult | None = None,
    ) -> str:
        language = analysis.detected_language if analysis else (profile.preferred_language if profile else "en")
        profile_hint = (
            f"preferred_language={profile.preferred_language!r}, "
            f"motherhood_stage={profile.motherhood_stage!r}, "
            f"support_types={profile.support_types!r}, "
            f"interaction_preferences={profile.interaction_preferences!r}"
            if profile
            else "none"
        )
        analysis_hint = (
            f"detected_language={analysis.detected_language!r}, "
            f"motherhood_stage={analysis.motherhood_stage!r}, "
            f"support_types={analysis.support_types!r}, "
            f"interaction_preferences={analysis.interaction_preferences!r}, "
            f"risk_level={analysis.risk_level!r}, "
            f"keywords={analysis.keywords!r}"
            if analysis
            else "none"
        )
        payload = {
            "model": self._model,
            "temperature": 0.3,
            "max_tokens": 320,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are MATRIA, a supportive assistant for perinatal mental health. "
                        "Be warm, concise, and practical. "
                        "Never diagnose, prescribe treatment, or claim crisis handling. "
                        "Do not invent hotlines, organizations, or citations. "
                        "Do not pretend to have document retrieval or sources. "
                        "Write one short paragraph, not bullets or numbered lists. "
                        "Offer 1 to 3 gentle next steps, keep the reply under 140 words, "
                        "and ask at most one short follow-up question. "
                        f"Reply in the user's language when possible. Preferred reply language: {language!r}. "
                        f"Profile hints: {profile_hint}. Analysis hints: {analysis_hint}."
                    ),
                },
                *[
                    {
                        "role": message.role,
                        "content": message.content,
                    }
                    for message in messages[-10:]
                ],
            ],
        }

        response_payload = self._post_chat_completion(payload)
        if self._finish_reason(response_payload) not in {None, "stop"}:
            raise GroqAPIError("Groq chat response was truncated.")
        return self._extract_message_text(response_payload)

    def translate_text(
        self,
        *,
        text: str,
        source_language: str,
        target_language: str,
    ) -> str:
        payload = {
            "model": self._model,
            "temperature": 0,
            "max_tokens": 500,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a precise translator for a perinatal mental health support platform. "
                        "Translate only the provided service description. Preserve meaning, tone, and safety-related wording. "
                        "Do not add explanations, notes, or quotation marks. Return only the translated text."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Translate this service description from {source_language} to {target_language}.\n\n"
                        f"{text}"
                    ),
                },
            ],
        }

        response_payload = self._post_chat_completion(payload)
        if self._finish_reason(response_payload) not in {None, "stop"}:
            raise GroqAPIError("Groq translation response was truncated.")
        return self._extract_message_text(response_payload)


@lru_cache(maxsize=1)
def get_groq_client() -> GroqClient:
    return GroqClient()
