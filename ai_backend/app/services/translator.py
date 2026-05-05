from __future__ import annotations

import json
import re
from urllib import parse, request

from app.clients.groq_client import GroqAPIError, GroqClient
from app.clients.sqlite_store import LocalDatabaseError, SQLiteStore
from app.schemas.translate import TranslationInput, TranslationResult

SUPPORTED_TRANSLATION_LANGUAGES = {"en", "ar", "pl", "hi", "ta", "ur"}
GOOGLE_TRANSLATE_BATCH_SIZE = 25
GOOGLE_BATCH_MARKER = "###"


def _cache_translation_safe(
    *,
    store: SQLiteStore,
    source_text: str,
    source_language: str,
    target_language: str,
    translated_text: str,
    provider: str,
) -> None:
    try:
        store.cache_translation(
            source_text=source_text,
            source_language=source_language,
            target_language=target_language,
            translated_text=translated_text,
            provider=provider,
        )
    except LocalDatabaseError:
        # Cache failures should not break live translations.
        return


def _translate_with_google_batch(
    *,
    texts: list[str],
    source_language: str,
    target_language: str,
) -> list[str]:
    translated_texts: list[str] = []

    for start in range(0, len(texts), GOOGLE_TRANSLATE_BATCH_SIZE):
        batch = texts[start:start + GOOGLE_TRANSLATE_BATCH_SIZE]
        query = "\n".join(f"{index + 1}{GOOGLE_BATCH_MARKER}{text}" for index, text in enumerate(batch))
        url = "https://translate.googleapis.com/translate_a/single?" + parse.urlencode(
            {
                "client": "gtx",
                "sl": source_language,
                "tl": target_language,
                "dt": "t",
                "q": query,
            }
        )

        with request.urlopen(url, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))

        translated_blob = "".join(part[0] for part in payload[0]).strip()
        parsed_lines = [line.strip() for line in translated_blob.splitlines() if line.strip()]
        indexed_results: dict[int, str] = {}

        for line in parsed_lines:
            match = re.search(r"(\d+)" + re.escape(GOOGLE_BATCH_MARKER), line)
            if not match:
                continue

            item_index = int(match.group(1)) - 1
            cleaned_line = re.sub(r"\d+" + re.escape(GOOGLE_BATCH_MARKER), "", line, count=1).strip()
            indexed_results[item_index] = cleaned_line

        if len(indexed_results) == len(batch):
            translated_texts.extend(indexed_results[index] for index in range(len(batch)))
            continue

        if len(parsed_lines) == len(batch):
            cleaned_lines = [
                re.sub(r"\d+" + re.escape(GOOGLE_BATCH_MARKER), "", line, count=1).strip()
                for line in parsed_lines
            ]
            translated_texts.extend(cleaned_lines)
            continue

        for text in batch:
            single_url = "https://translate.googleapis.com/translate_a/single?" + parse.urlencode(
                {
                    "client": "gtx",
                    "sl": source_language,
                    "tl": target_language,
                    "dt": "t",
                    "q": text,
                }
            )
            with request.urlopen(single_url, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
            translated_texts.append("".join(part[0] for part in payload[0]).strip())

    return translated_texts


def translate_items(
    *,
    items: list[TranslationInput],
    target_language: str,
    store: SQLiteStore,
    groq_client: GroqClient,
    provider_preference: str = "auto",
) -> list[TranslationResult]:
    normalized_target = target_language.lower().strip()
    if normalized_target not in SUPPORTED_TRANSLATION_LANGUAGES:
        raise ValueError(f"Unsupported target language: {target_language}")

    normalized_provider = provider_preference.lower().strip() or "auto"
    if normalized_provider not in {"auto", "groq", "google"}:
        raise ValueError(f"Unsupported translation provider: {provider_preference}")

    results: list[TranslationResult] = []
    uncached_google_items: list[TranslationInput] = []
    pending_google_indices: list[int] = []

    for index, item in enumerate(items):
        source_language = item.source_language.lower().strip() or "en"
        if source_language not in SUPPORTED_TRANSLATION_LANGUAGES:
            source_language = "en"

        if source_language == normalized_target:
            results.append(
                TranslationResult(
                    key=item.key,
                    source_text=item.text,
                    source_language=source_language,
                    target_language=normalized_target,
                    translated_text=item.text,
                    cached=True,
                    provider="identity",
                )
            )
            continue

        cached = store.get_cached_translation(
            source_text=item.text,
            source_language=source_language,
            target_language=normalized_target,
            provider="groq",
        )
        if cached is not None:
            results.append(
                TranslationResult(
                    key=item.key,
                    source_text=item.text,
                    source_language=source_language,
                    target_language=normalized_target,
                    translated_text=cached["translated_text"],
                    cached=True,
                    provider="groq",
                )
            )
            continue

        if normalized_provider == "google":
            uncached_google_items.append(
                TranslationInput(
                    key=item.key,
                    text=item.text,
                    source_language=source_language,
                )
            )
            pending_google_indices.append(index)
            results.append(
                TranslationResult(
                    key=item.key,
                    source_text=item.text,
                    source_language=source_language,
                    target_language=normalized_target,
                    translated_text=item.text,
                    cached=False,
                    provider="google",
                )
            )
            continue

        translated_text = item.text
        provider = "fallback"
        use_groq = normalized_provider in {"auto", "groq"} and groq_client.is_configured

        if use_groq:
            try:
                translated_text = groq_client.translate_text(
                    text=item.text,
                    source_language=source_language,
                    target_language=normalized_target,
                )
                provider = "groq"
            except GroqAPIError:
                translated_text = item.text
                provider = "fallback"

        if provider == "groq":
            _cache_translation_safe(
                store=store,
                source_text=item.text,
                source_language=source_language,
                target_language=normalized_target,
                translated_text=translated_text,
                provider=provider,
            )

        results.append(
            TranslationResult(
                key=item.key,
                source_text=item.text,
                source_language=source_language,
                target_language=normalized_target,
                translated_text=translated_text,
                cached=False,
                provider=provider,
            )
        )

    if uncached_google_items:
        grouped_items: dict[str, list[tuple[int, TranslationInput]]] = {}

        for result_index, item in zip(pending_google_indices, uncached_google_items):
            source_language = item.source_language.lower().strip() or "en"
            grouped_items.setdefault(source_language, []).append((result_index, item))

        for source_language, grouped in grouped_items.items():
            translated_batch = _translate_with_google_batch(
                texts=[item.text for _, item in grouped],
                source_language=source_language,
                target_language=normalized_target,
            )

            for (result_index, item), translated_text in zip(grouped, translated_batch):
                _cache_translation_safe(
                    store=store,
                    source_text=item.text,
                    source_language=source_language,
                    target_language=normalized_target,
                    translated_text=translated_text,
                    provider="google",
                )
                results[result_index] = TranslationResult(
                    key=item.key,
                    source_text=item.text,
                    source_language=source_language,
                    target_language=normalized_target,
                    translated_text=translated_text,
                    cached=False,
                    provider="google",
                )

    return results
