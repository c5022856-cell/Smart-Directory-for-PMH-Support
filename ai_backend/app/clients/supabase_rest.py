from __future__ import annotations

from functools import lru_cache
from typing import Any

import httpx

from app.config import Settings, get_settings


class SupabaseAPIError(RuntimeError):
    """Raised when Supabase returns a non-successful response."""


class SupabaseRestClient:
    def __init__(self, settings: Settings) -> None:
        if not settings.supabase_url or not settings.supabase_api_key:
            raise SupabaseAPIError("Supabase URL or API key is not configured.")
        self._settings = settings
        self._client = httpx.Client(
            base_url=f"{settings.supabase_url}/rest/v1",
            timeout=settings.request_timeout_seconds,
        )

    def _headers(self, prefer: str | None = None) -> dict[str, str]:
        headers = {
            "apikey": self._settings.supabase_api_key,
            "Authorization": f"Bearer {self._settings.supabase_api_key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        json: Any = None,
        prefer: str | None = None,
    ) -> Any:
        response = self._client.request(
            method,
            path,
            params=params,
            json=json,
            headers=self._headers(prefer=prefer),
        )

        if response.is_success:
            if not response.content:
                return None
            return response.json()

        try:
            payload = response.json()
            message = payload.get("message") or payload.get("error") or response.text
        except ValueError:
            message = response.text

        raise SupabaseAPIError(f"Supabase {method} {path} failed: {response.status_code} {message}")

    def list_services(self) -> list[dict[str, Any]]:
        return self._request(
            "GET",
            "/services",
            params={
                "select": "*",
                "is_active": "eq.true",
                "order": "priority_level.desc,rating.desc,name.asc",
            },
        )

    def list_events(self) -> list[dict[str, Any]]:
        return self._request(
            "GET",
            "/events",
            params={
                "select": "*",
                "order": "event_date.asc",
            },
        )

    def insert_support_request(self, payload: dict[str, Any]) -> dict[str, Any] | None:
        rows = self._request(
            "POST",
            "/support_requests",
            json=payload,
            prefer="return=representation",
        )
        if isinstance(rows, list) and rows:
            return rows[0]
        return None


@lru_cache(maxsize=1)
def get_supabase_client() -> SupabaseRestClient:
    return SupabaseRestClient(get_settings())
