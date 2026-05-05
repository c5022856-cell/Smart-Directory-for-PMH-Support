from __future__ import annotations

import re
from typing import Iterable

from app.clients.groq_client import GroqAPIError, GroqClient
from app.schemas.analyze import AnalysisResult, LLMAnalysisPayload, RiskLevel, UserProfileContext

ARABIC_SCRIPT_PATTERN = re.compile(r"[\u0600-\u06FF]")
DEVANAGARI_PATTERN = re.compile(r"[\u0900-\u097F]")
TAMIL_PATTERN = re.compile(r"[\u0B80-\u0BFF]")
POLISH_CHARS = set("ąćęłńóśźż")
URDU_HINTS = ("ہے", "میں", "اور", "کہ", "کے", "کی")

RESOURCE_KEYWORDS = {
    "mental health",
    "depression",
    "anxiety",
    "ptsd",
    "trauma",
    "wellbeing",
    "refugee",
    "asylum seeker",
    "asian",
    "south-asian",
    "black",
    "lesbian",
    "single",
    "group counselling",
    "birth",
    "pre-birth",
    "parent",
    "partner",
    "gp",
    "health visitor",
    "midwife",
    "family",
    "crying",
    "sleep",
    "religion",
    "sheffield",
    "christian",
    "therapy",
    "exhaustion",
    "nonbonding",
    "bad mom",
    "feeding problems",
    "feeding",
    "email",
    "phone",
    "online",
    "social",
    "social media",
    "apps",
    "facebook",
    "peanuts",
    "twitter",
    "uk",
    "nationwide",
}

SUPPORT_TYPE_KEYWORDS = {
    "clinical": {
        "mental health",
        "depression",
        "anxiety",
        "ptsd",
        "trauma",
        "therapy",
        "gp",
        "health visitor",
        "midwife",
    },
    "peer": {
        "refugee",
        "asylum seeker",
        "asian",
        "south-asian",
        "black",
        "lesbian",
        "single",
        "partner",
        "family",
        "religion",
        "christian",
        "group counselling",
    },
    "practical": {
        "wellbeing",
        "parent",
        "crying",
        "sleep",
        "exhaustion",
        "feeding problems",
        "feeding",
        "birth",
        "pre-birth",
        "nonbonding",
        "bad mom",
    },
}

INTERACTION_KEYWORDS = {
    "phone": {"phone", "call", "helpline", "hotline"},
    "email": {"email", "e-mail"},
    "online": {"online", "website", "web", "resource"},
    "social": {"social", "social media", "instagram", "facebook", "twitter", "apps"},
    "message": {"text", "sms", "whatsapp", "chat"},
}

URGENT_PATTERNS = (
    "suicide",
    "kill myself",
    "hurt myself",
    "harm myself",
    "harm my baby",
    "hurt my baby",
    "can't go on",
    "cannot go on",
)

HIGH_RISK_PATTERNS = (
    "self harm",
    "self-harm",
    "unsafe",
    "abuse",
    "violence",
    "in danger",
    "emergency",
)

RISK_PRIORITY: dict[RiskLevel, int] = {
    "low": 0,
    "medium": 1,
    "high": 2,
    "urgent": 3,
}

CRISIS_GUIDANCE = {
    "en": (
        "Immediate support may be needed. If you or your baby are in danger, contact local emergency services now. "
        "For urgent mental health support in the UK, phone 111 and select the mental health option, "
        "phone Samaritans on 116 123, or text EYUP to 85258."
    ),
    "ar": (
        "قد تكون هناك حاجة إلى دعم فوري. إذا كنتِ أنتِ أو طفلكِ في خطر، اتصلي بخدمات الطوارئ المحلية الآن. "
        "للدعم العاجل في المملكة المتحدة، اتصلي بـ 111 واختاري خيار الصحة النفسية، أو اتصلي بساماريتانز على 116 123، أو أرسلي EYUP إلى 85258."
    ),
    "pl": (
        "Może być potrzebne natychmiastowe wsparcie. Jeśli Ty lub Twoje dziecko jesteście w niebezpieczeństwie, "
        "skontaktuj się teraz z lokalnymi służbami ratunkowymi. W Wielkiej Brytanii możesz zadzwonić pod 111 i wybrać opcję zdrowia psychicznego, "
        "zadzwonić do Samaritans pod 116 123 albo wysłać EYUP na 85258."
    ),
    "hi": (
        "तुरंत सहायता की आवश्यकता हो सकती है। यदि आप या आपका बच्चा खतरे में हैं, तो अभी स्थानीय आपातकालीन सेवाओं से संपर्क करें। "
        "यूके में तुरंत मानसिक स्वास्थ्य सहायता के लिए 111 पर कॉल करें और मानसिक स्वास्थ्य विकल्प चुनें, 116 123 पर Samaritans को कॉल करें, या EYUP को 85258 पर टेक्स्ट करें।"
    ),
    "ta": (
        "உடனடி உதவி தேவைப்படலாம். நீங்கள் அல்லது உங்கள் குழந்தை ஆபத்தில் இருந்தால், உடனே உள்ளூர் அவசர சேவையை தொடர்புகொள்ளுங்கள். "
        "இங்கிலாந்தில் அவசர மனநல உதவிக்கு 111 அழைத்து mental health option ஐ தேர்வுசெய்யவும், 116 123 இல் Samaritans ஐ அழைக்கவும், அல்லது EYUP என்பதை 85258 க்கு அனுப்பவும்."
    ),
    "ur": (
        "فوری مدد کی ضرورت ہو سکتی ہے۔ اگر آپ یا آپ کا بچہ خطرے میں ہیں تو ابھی مقامی ایمرجنسی سروسز سے رابطہ کریں۔ "
        "برطانیہ میں فوری ذہنی صحت کی مدد کے لیے 111 پر کال کریں اور mental health option منتخب کریں، Samaritans کو 116 123 پر کال کریں، یا EYUP کو 85258 پر ٹیکسٹ کریں۔"
    ),
}


def detect_language(text: str, profile: UserProfileContext | None = None) -> str:
    preferred_language = (profile.preferred_language or "").strip().lower() if profile else ""
    if preferred_language in {"en", "ar", "pl", "hi", "ta", "ur"}:
        return preferred_language

    lowered = text.lower()

    if any(char in lowered for char in POLISH_CHARS) or any(token in lowered for token in ("jestem", "potrzebuje", "pomocy")):
        return "pl"

    if DEVANAGARI_PATTERN.search(text):
        return "hi"

    if TAMIL_PATTERN.search(text):
        return "ta"

    if ARABIC_SCRIPT_PATTERN.search(text):
        if any(token in text for token in URDU_HINTS):
            return "ur"
        return "ar"

    return "en"


def _match_specific_keywords(text: str) -> list[str]:
    lowered = text.lower()
    return sorted(keyword for keyword in RESOURCE_KEYWORDS if keyword in lowered)


def _match_group_keywords(text: str, groups: dict[str, set[str]]) -> list[str]:
    lowered = text.lower()
    matched: list[str] = []
    for group, keywords in groups.items():
        if any(keyword in lowered for keyword in keywords):
            matched.append(group)
    return matched


def _contains_token(text: str, *tokens: str) -> bool:
    return any(re.search(rf"\b{re.escape(token)}\b", text) for token in tokens)


def _infer_workflow_keywords(text: str) -> list[str]:
    lowered = text.lower()
    has_sheffield = "sheffield" in lowered
    has_uk = _contains_token(lowered, "uk", "national", "nationwide")
    has_phone = _contains_token(lowered, "phone", "call", "helpline", "hotline")
    has_email = _contains_token(lowered, "email", "e-mail")
    has_online = _contains_token(lowered, "online", "website", "web", "resource", "toolkit")
    has_app = _contains_token(lowered, "app", "apps", "peanut", "peanuts")
    has_facebook = _contains_token(lowered, "facebook", "fb")
    has_x = _contains_token(lowered, "x", "twitter")
    has_social = (
        "social media" in lowered
        or _contains_token(lowered, "social", "instagram")
        or has_app
        or has_facebook
        or has_x
    )

    inferred: list[str] = []

    if has_sheffield:
        if has_social:
            if has_app:
                inferred.append("workflow:sheffield:social:apps")
            elif has_facebook:
                inferred.append("workflow:sheffield:social:facebook")
            elif has_x:
                inferred.append("workflow:sheffield:social:x")
            else:
                inferred.append("workflow:sheffield:social")
        elif has_phone or has_email:
            inferred.append("workflow:sheffield:phone-email")
        elif has_online:
            inferred.append("workflow:sheffield:online")

    if has_uk:
        if has_online:
            inferred.append("workflow:uk:online")
        else:
            if has_email:
                inferred.append("workflow:uk:email")
            if has_phone:
                inferred.append("workflow:uk:phone")

    return inferred


def detect_risk(text: str) -> RiskLevel:
    lowered = text.lower()
    if any(pattern in lowered for pattern in URGENT_PATTERNS):
        return "urgent"
    if any(pattern in lowered for pattern in HIGH_RISK_PATTERNS):
        return "high"
    if any(keyword in lowered for keyword in ("panic", "depressed", "hopeless", "breakdown")):
        return "medium"
    return "low"


def build_summary(text: str) -> str:
    compact = " ".join(text.split())
    if len(compact) <= 220:
        return compact
    return f"{compact[:217].rstrip()}..."


def _dedupe(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if not value or value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def _heuristic_analysis(text: str, profile: UserProfileContext | None = None) -> AnalysisResult:
    detected_language = detect_language(text, profile)
    support_types = _match_group_keywords(text, SUPPORT_TYPE_KEYWORDS)
    interaction_preferences = _match_group_keywords(text, INTERACTION_KEYWORDS)
    keywords = [*_match_specific_keywords(text), *_infer_workflow_keywords(text)]
    risk_level = detect_risk(text)

    if risk_level in {"high", "urgent"} and "crisis" not in support_types:
        support_types.append("crisis")

    if not keywords and profile and profile.preferred_language:
        keywords = [profile.preferred_language]

    requires_crisis_action = risk_level in {"high", "urgent"}

    return AnalysisResult(
        detected_language=detected_language,
        motherhood_stage=None,
        support_types=_dedupe(support_types),
        interaction_preferences=_dedupe(interaction_preferences),
        risk_level=risk_level,
        keywords=_dedupe(keywords),
        summary=build_summary(text),
        requires_crisis_action=requires_crisis_action,
        crisis_guidance=CRISIS_GUIDANCE.get(detected_language, CRISIS_GUIDANCE["en"]) if requires_crisis_action else None,
    )


def _merge_llm_analysis(heuristic: AnalysisResult, llm_result: LLMAnalysisPayload) -> AnalysisResult:
    merged_risk = max((heuristic.risk_level, llm_result.risk_level), key=lambda risk: RISK_PRIORITY[risk])
    support_types = _dedupe([*llm_result.support_types, *heuristic.support_types])
    if merged_risk in {"high", "urgent"} and "crisis" not in support_types:
        support_types.append("crisis")

    interaction_preferences = _dedupe([*llm_result.interaction_preferences, *heuristic.interaction_preferences])
    keywords = _dedupe([*llm_result.keywords, *heuristic.keywords])

    return AnalysisResult(
        detected_language=llm_result.detected_language or heuristic.detected_language,
        motherhood_stage=llm_result.motherhood_stage or heuristic.motherhood_stage,
        support_types=support_types,
        interaction_preferences=interaction_preferences,
        risk_level=merged_risk,
        keywords=keywords,
        summary=llm_result.summary or heuristic.summary,
        requires_crisis_action=merged_risk in {"high", "urgent"},
        crisis_guidance=(
            CRISIS_GUIDANCE.get(llm_result.detected_language or heuristic.detected_language, CRISIS_GUIDANCE["en"])
            if merged_risk in {"high", "urgent"}
            else None
        ),
    )


def analyze_support_text(
    text: str,
    profile: UserProfileContext | None = None,
    groq_client: GroqClient | None = None,
) -> AnalysisResult:
    heuristic = _heuristic_analysis(text, profile)

    if not groq_client or not groq_client.is_configured:
        return heuristic

    try:
        llm_result = groq_client.analyze_support_text(text, profile)
    except GroqAPIError:
        return heuristic

    return _merge_llm_analysis(heuristic, llm_result)
