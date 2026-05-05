from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.schemas.recommend import EventRecommendation, RecommendationContext, ServiceRecommendation

LANGUAGE_LABELS = {
    "en": "English",
    "english": "English",
    "ar": "Arabic",
    "arabic": "Arabic",
    "pl": "Polish",
    "polish": "Polish",
    "hi": "Hindi",
    "hindi": "Hindi",
    "ta": "Tamil",
    "tamil": "Tamil",
    "ur": "Urdu",
    "urdu": "Urdu",
}

INTERACTION_TO_MODE = {
    "inperson": "in-person",
    "online": "online",
    "phone": "phone",
    "message": "message",
    "email": "email",
    "social": "social",
}

WORKFLOW_BRANCH_SERVICE_IDS = {
    "workflow:sheffield:phone-email": [
        "service-no-panic-cb-therapy",
        "service-light-support-services",
        "service-talking-therapies-sheffield",
        "service-roshini-sheffield",
    ],
    "workflow:sheffield:online": [
        "service-sps",
        "service-sheffield-perinatal-mental-health",
        "service-sheffield-flourish",
        "service-sheffield-mind",
        "service-bird-mind",
    ],
    "workflow:sheffield:social": [
        "service-peanuts",
        "service-mat-exp",
        "service-birth-trauma-association-peer-support",
        "service-pnd",
        "service-birth-trauma",
    ],
    "workflow:sheffield:social:apps": [
        "service-peanuts",
    ],
    "workflow:sheffield:social:facebook": [
        "service-mat-exp",
        "service-birth-trauma-association-peer-support",
    ],
    "workflow:sheffield:social:x": [
        "service-pnd",
        "service-birth-trauma",
    ],
    "workflow:uk:email": [
        "service-bacp",
        "service-cry-sis",
    ],
    "workflow:uk:phone": [
        "service-cry-sis",
        "service-womens-aid",
    ],
    "workflow:uk:online": [
        "service-mind-uk",
        "service-right-decisions-maternal-health-tool-kit",
    ],
}


def _normalize_str(value: str | None) -> str:
    return (value or "").strip().lower()


def _normalize_list(values: Any) -> list[str]:
    if not values:
        return []
    if isinstance(values, list):
        return [_normalize_str(value) for value in values if value]
    return [_normalize_str(values)]


def _display_language(value: str) -> str:
    return LANGUAGE_LABELS.get(_normalize_str(value), value.title())


def _build_reason(parts: list[str]) -> str | None:
    if not parts:
        return None
    if len(parts) == 1:
        return parts[0]
    return ", ".join(parts[:-1]) + f", and {parts[-1]}"


def _match_access_mode(service: dict[str, Any], wanted_mode: str, modes: list[str]) -> bool:
    if wanted_mode in modes:
        return True
    if wanted_mode == "phone":
        return bool(service.get("phone"))
    if wanted_mode == "email":
        return bool(service.get("email"))
    if wanted_mode == "online":
        return bool(service.get("website")) or "online" in modes
    if wanted_mode == "social":
        return "social" in modes
    if wanted_mode == "message":
        return "message" in modes
    return False


def _location_preference(keywords: list[str]) -> str | None:
    keyword_set = set(keywords)
    if "sheffield" in keyword_set:
        return "sheffield"
    if "uk" in keyword_set or "nationwide" in keyword_set:
        return "national"
    return None


def _workflow_service_ids(keywords: list[str]) -> list[str]:
    service_ids: list[str] = []
    for keyword in keywords:
        for service_id in WORKFLOW_BRANCH_SERVICE_IDS.get(_normalize_str(keyword), []):
            if service_id not in service_ids:
                service_ids.append(service_id)
    return service_ids


def rank_services(
    services: list[dict[str, Any]],
    context: RecommendationContext | None = None,
    *,
    query: str | None = None,
    support_type: str | None = None,
    limit: int = 12,
) -> list[ServiceRecommendation]:
    normalized_query = _normalize_str(query)
    normalized_type = _normalize_str(support_type)
    preferred_language = _normalize_str(context.preferred_language) if context else ""
    wanted_support = set(_normalize_list(context.support_types) if context else [])
    wanted_modes = [
        INTERACTION_TO_MODE.get(mode, mode)
        for mode in (_normalize_list(context.interaction_preferences) if context else [])
        if mode
    ]
    keywords = _normalize_list(context.keywords) if context else []
    location_preference = _location_preference(keywords)
    workflow_service_ids = _workflow_service_ids(keywords)
    workflow_order = {service_id: index for index, service_id in enumerate(workflow_service_ids)}
    risk_level = context.risk_level if context else "low"

    ranked_items: list[ServiceRecommendation] = []

    for service in services:
        service_id = str(service.get("id"))
        name = str(service.get("name", "")).strip()
        description = str(service.get("description") or "")
        service_type = _normalize_str(service.get("support_type"))

        if normalized_query and normalized_query not in name.lower() and normalized_query not in description.lower():
            continue

        if normalized_type and service_type != normalized_type:
            continue

        languages = _normalize_list(service.get("languages"))
        modes = _normalize_list(service.get("delivery_modes"))
        stages = _normalize_list(service.get("motherhood_stages"))
        support_tags = _normalize_list(service.get("support_tags"))
        location = _normalize_str(service.get("location"))

        score = float(service.get("priority_level") or 0)
        reasons: list[str] = []

        if service_id in workflow_order:
            score += 100 - workflow_order[service_id]
            reasons.append("matches the selected workflow branch")

        if preferred_language and preferred_language in languages:
            score += 3
            reasons.append(f"available in {LANGUAGE_LABELS.get(preferred_language, preferred_language.title())}")

        if location_preference == "sheffield" and location == "sheffield":
            score += 7
            reasons.append("matches the Sheffield branch")
        elif location_preference == "national" and location in {"national", "uk", "nationwide"}:
            score += 7
            reasons.append("matches the UK-wide branch")

        matched_modes = [mode for mode in wanted_modes if _match_access_mode(service, mode, modes)]
        if matched_modes:
            score += len(matched_modes) * 3
            reasons.append(f"offers {', '.join(sorted(set(matched_modes)))} access")

        matched_support = sorted(wanted_support.intersection(set(support_tags + [service_type])))
        if matched_support:
            score += len(matched_support) * 2
            reasons.append(f"matches {', '.join(matched_support)} directory tags")

        keyword_hits: list[str] = []
        searchable_fields = " ".join(
            [
                name.lower(),
                description.lower(),
                location,
                " ".join(support_tags),
                " ".join(modes),
            ]
        )
        for keyword in keywords:
            if keyword and keyword in searchable_fields:
                keyword_hits.append(keyword)
        if keyword_hits:
            unique_hits = sorted(set(keyword_hits))
            score += min(len(unique_hits) * 2, 10)
            reasons.append(f"matches keywords: {', '.join(unique_hits[:4])}")

        if normalized_query:
            score += 2
            reasons.append("matches your search text")

        if risk_level in {"high", "urgent"} and service.get("crisis_capable"):
            score += 5
            reasons.append("includes urgent support options")

        rating = float(service.get("rating") or 0)
        review_count = int(service.get("review_count") or 0)
        if rating:
            score += rating / 10

        ranked_items.append(
            ServiceRecommendation(
                id=service_id,
                name=name,
                description=description or None,
                support_type=service_type or "general",
                languages=[_display_language(language) for language in languages],
                delivery_modes=modes,
                motherhood_stages=stages,
                support_tags=support_tags,
                location=service.get("location"),
                distance_label=service.get("distance_label"),
                availability=service.get("availability"),
                phone=service.get("phone"),
                email=service.get("email"),
                website=service.get("website"),
                address=service.get("address"),
                rating=rating or None,
                review_count=review_count or None,
                crisis_capable=bool(service.get("crisis_capable")),
                score=round(score, 2),
                recommendation_reason=_build_reason(reasons),
                is_recommended=False,
            )
        )

    ranked_items.sort(key=lambda item: (-item.score, item.name.lower()))

    if workflow_order:
        for item in ranked_items:
            item.is_recommended = item.id in workflow_order
    else:
        should_mark_recommended = bool(context and (keywords or wanted_modes or wanted_support or preferred_language))
        if should_mark_recommended:
            for index, item in enumerate(ranked_items):
                item.is_recommended = index < min(3, len(ranked_items)) or item.score >= 8

    return ranked_items[:limit]


def rank_events(
    events: list[dict[str, Any]],
    context: RecommendationContext | None = None,
    *,
    limit: int = 6,
) -> list[EventRecommendation]:
    preferred_language = _normalize_str(context.preferred_language) if context else ""
    wanted_support = set(_normalize_list(context.support_types) if context else [])
    wanted_modes = {
        INTERACTION_TO_MODE.get(mode, mode)
        for mode in (_normalize_list(context.interaction_preferences) if context else [])
    }

    ranked_items: list[EventRecommendation] = []

    for event in events:
        score = 0.0
        reasons: list[str] = []
        topic = _normalize_str(event.get("topic"))
        language = _normalize_str(event.get("language"))
        mode = _normalize_str(event.get("mode"))

        if preferred_language and preferred_language == language:
            score += 3
            reasons.append(f"available in {LANGUAGE_LABELS.get(language, language.title())}")

        if topic and any(topic.startswith(support_type) or support_type in topic for support_type in wanted_support):
            score += 3
            reasons.append(f"matches {topic}")

        if mode and mode in wanted_modes:
            score += 2
            reasons.append(f"runs as {mode}")

        try:
            event_time = datetime.fromisoformat(str(event.get("event_date")).replace("Z", "+00:00"))
            days_until = (event_time - datetime.now(timezone.utc)).days
            if days_until >= 0:
                score += max(0, 2 - min(days_until / 14, 2))
        except ValueError:
            pass

        ranked_items.append(
            EventRecommendation(
                id=str(event.get("id", "")),
                title=str(event.get("title", "")),
                topic=str(event.get("topic", "")),
                description=event.get("description"),
                language=LANGUAGE_LABELS.get(language, str(event.get("language", "")).title()),
                event_date=str(event.get("event_date", "")),
                mode=str(event.get("mode", "")),
                location=event.get("location"),
                score=round(score, 2),
                recommendation_reason=_build_reason(reasons),
            )
        )

    ranked_items.sort(key=lambda item: (-item.score, item.event_date))
    return ranked_items[:limit]
