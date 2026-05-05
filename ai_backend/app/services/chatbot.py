from __future__ import annotations

from app.clients.groq_client import GroqAPIError, GroqClient
from app.schemas.analyze import AnalysisResult, UserProfileContext
from app.schemas.chat import ChatMessage, ChatResponse
from app.services.analyzer import analyze_support_text

SAFE_DISCLAIMER = "Supportive guidance only. This chat does not provide diagnosis or emergency care."
CRISIS_DISCLAIMER = "Safety-first reply. If there is immediate danger, contact local emergency services now."

CRISIS_RESPONSES = {
    "en": (
        "I am concerned that you may need urgent support right now. "
        "Please contact local emergency services immediately if you or your baby are in danger. "
        "If you can, reach out to a trusted person to stay with you and use a crisis support line now."
    ),
    "ar": (
        "أنا قلقة من أنك قد تحتاجين إلى دعم عاجل الآن. "
        "يرجى الاتصال بخدمات الطوارئ المحلية فوراً إذا كنتِ أنتِ أو طفلكِ في خطر. "
        "إذا استطعتِ، تواصلي مع شخص موثوق ليبقى معكِ واستخدمي خط دعم الأزمات الآن."
    ),
    "pl": (
        "Obawiam się, że możesz teraz potrzebować pilnego wsparcia. "
        "Jeśli Ty lub Twoje dziecko jesteście w niebezpieczeństwie, natychmiast skontaktuj się z lokalnymi służbami ratunkowymi. "
        "Jeśli możesz, skontaktuj się z zaufaną osobą, aby została z Tobą, i użyj teraz telefonu kryzysowego."
    ),
}

FALLBACK_RESPONSES = {
    "en": (
        "I am here with you. From what you shared, it sounds like you may need {support_phrase}. "
        "I can help you think through gentle next steps, but I cannot diagnose. "
        "A good next step is to check the support directory for {next_step}. "
        "If you want, tell me whether phone, message, online, or in-person support feels easiest right now."
    ),
    "ar": (
        "أنا هنا معكِ. من كلامك يبدو أنك قد تحتاجين إلى {support_phrase}. "
        "يمكنني مساعدتك في التفكير في خطوات لطيفة تالية، لكنني لا أستطيع التشخيص. "
        "الخطوة التالية الجيدة هي الاطلاع على دليل الدعم للعثور على {next_step}. "
        "إذا أردتِ، أخبريني هل الدعم الهاتفي أم عبر الإنترنت أم الحضوري هو الأسهل لكِ الآن."
    ),
    "pl": (
        "Jestem tu z Tobą. Z tego, co napisałaś, wygląda na to, że możesz potrzebować {support_phrase}. "
        "Mogę pomóc Ci przemyśleć łagodne kolejne kroki, ale nie mogę stawiać diagnozy. "
        "Dobrym następnym krokiem jest sprawdzenie katalogu wsparcia, aby znaleźć {next_step}. "
        "Jeśli chcesz, napisz, czy teraz najłatwiejsze byłoby wsparcie telefoniczne, przez wiadomość, online czy osobiste."
    ),
}

SUPPORT_LABELS = {
    "en": {
        "emotional": "emotional support",
        "practical": "practical help",
        "clinical": "professional support",
        "peer": "peer support",
        "crisis": "urgent support",
    },
    "ar": {
        "emotional": "دعم عاطفي",
        "practical": "مساعدة عملية",
        "clinical": "دعم مهني",
        "peer": "دعم من أمهات أخريات",
        "crisis": "دعم عاجل",
    },
    "pl": {
        "emotional": "wsparcia emocjonalnego",
        "practical": "pomocy praktycznej",
        "clinical": "profesjonalnego wsparcia",
        "peer": "wsparcia rówieśniczego",
        "crisis": "pilnego wsparcia",
    },
}

NEXT_STEP_LABELS = {
    "en": {
        "emotional": "emotional and peer support options",
        "practical": "practical support services",
        "clinical": "professional services",
        "peer": "peer support groups",
        "crisis": "urgent support options",
    },
    "ar": {
        "emotional": "خيارات الدعم العاطفي ودعم الأقران",
        "practical": "خدمات الدعم العملي",
        "clinical": "الخدمات المهنية",
        "peer": "مجموعات دعم الأقران",
        "crisis": "خيارات الدعم العاجل",
    },
    "pl": {
        "emotional": "opcji wsparcia emocjonalnego i grup wsparcia",
        "practical": "usług praktycznego wsparcia",
        "clinical": "usług profesjonalnych",
        "peer": "grup wsparcia rówieśniczego",
        "crisis": "opcji pilnego wsparcia",
    },
}


def _preferred_language(analysis: AnalysisResult) -> str:
    language = (analysis.detected_language or "en").lower()
    return language if language in {"en", "ar", "pl"} else "en"


def _format_list(parts: list[str], language: str) -> str:
    if not parts:
        return SUPPORT_LABELS[language]["emotional"]
    if len(parts) == 1:
        return parts[0]
    conjunction = {"en": "and", "ar": "و", "pl": "i"}[language]
    return ", ".join(parts[:-1]) + f" {conjunction} {parts[-1]}"


def _build_crisis_response(analysis: AnalysisResult) -> ChatResponse:
    language = _preferred_language(analysis)
    return ChatResponse(
        message=ChatMessage(role="assistant", content=CRISIS_RESPONSES[language]),
        risk_level=analysis.risk_level,
        used_fallback=True,
        disclaimer=CRISIS_DISCLAIMER,
    )


def _build_fallback_reply(analysis: AnalysisResult) -> str:
    language = _preferred_language(analysis)
    support_labels = SUPPORT_LABELS[language]
    next_step_labels = NEXT_STEP_LABELS[language]
    support_types = analysis.support_types or ["emotional"]
    support_phrase = _format_list([support_labels.get(item, support_labels["emotional"]) for item in support_types], language)
    next_step = next_step_labels.get(support_types[0], next_step_labels["emotional"])
    return FALLBACK_RESPONSES[language].format(
        support_phrase=support_phrase,
        next_step=next_step,
    )


def generate_chat_response(
    messages: list[ChatMessage],
    profile: UserProfileContext | None = None,
    groq_client: GroqClient | None = None,
) -> ChatResponse:
    latest_user_message = next((message for message in reversed(messages) if message.role == "user"), None)
    if latest_user_message is None:
        return ChatResponse(
            message=ChatMessage(
                role="assistant",
                content="Tell me what is feeling hardest right now, and I will help you think through supportive next steps.",
            ),
            used_fallback=True,
            disclaimer=SAFE_DISCLAIMER,
        )

    relevant_user_messages = [message for message in messages if message.role == "user"][-5:]
    highest_risk_analysis: AnalysisResult | None = None

    for candidate in relevant_user_messages:
        analysis = analyze_support_text(candidate.content, profile, groq_client=groq_client)
        if highest_risk_analysis is None:
            highest_risk_analysis = analysis
            continue

        if analysis.risk_level in {"high", "urgent"} and highest_risk_analysis.risk_level not in {"high", "urgent"}:
            highest_risk_analysis = analysis
        elif analysis.risk_level == "urgent" and highest_risk_analysis.risk_level != "urgent":
            highest_risk_analysis = analysis

    analysis = highest_risk_analysis or analyze_support_text(latest_user_message.content, profile, groq_client=groq_client)
    if analysis.risk_level in {"high", "urgent"}:
        return _build_crisis_response(analysis)

    if groq_client and groq_client.is_configured:
        try:
            reply = groq_client.generate_support_reply(messages=messages, profile=profile, analysis=analysis)
            return ChatResponse(
                message=ChatMessage(role="assistant", content=reply),
                risk_level=analysis.risk_level,
                used_fallback=False,
                disclaimer=SAFE_DISCLAIMER,
            )
        except GroqAPIError:
            pass

    return ChatResponse(
        message=ChatMessage(role="assistant", content=_build_fallback_reply(analysis)),
        risk_level=analysis.risk_level,
        used_fallback=True,
        disclaimer=SAFE_DISCLAIMER,
    )
