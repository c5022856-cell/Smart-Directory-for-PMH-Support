from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


def _parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, raw_value = line.split("=", 1)
        values[key.strip()] = raw_value.strip().strip('"').strip("'")

    return values


def _read_setting(name: str, fallback: dict[str, str], default: str | None = None) -> str | None:
    return os.getenv(name) or fallback.get(name) or default


@dataclass(frozen=True)
class Settings:
    database_path: Path
    request_timeout_seconds: float
    cors_origins: tuple[str, ...]
    groq_api_key: str | None = None
    groq_model: str | None = None
    groq_api_base: str = "https://api.groq.com/openai/v1"
    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None

    @property
    def supabase_api_key(self) -> str | None:
        return self.supabase_service_role_key or self.supabase_anon_key


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    project_root = Path(__file__).resolve().parents[2]
    frontend_env = _parse_env_file(project_root / "pmh_frontend" / ".env")
    backend_env = _parse_env_file(project_root / "ai_backend" / ".env")
    combined_env = {**frontend_env, **backend_env}

    raw_cors = _read_setting(
        "AI_CORS_ORIGINS",
        combined_env,
        "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8080,http://localhost:8080",
    )
    cors_origins = tuple(origin.strip() for origin in raw_cors.split(",") if origin.strip())

    raw_database_path = _read_setting(
        "AI_DATABASE_PATH",
        combined_env,
        str(project_root / "ai_backend" / "data" / "matria_ai.db"),
    )

    return Settings(
        database_path=Path(raw_database_path).expanduser().resolve(),
        request_timeout_seconds=float(_read_setting("AI_REQUEST_TIMEOUT_SECONDS", combined_env, "10") or "10"),
        cors_origins=cors_origins,
        groq_api_key=_read_setting("GROQ_API_KEY", combined_env),
        groq_model=_read_setting("GROQ_MODEL", combined_env, "openai/gpt-oss-20b"),
        groq_api_base=_read_setting("GROQ_API_BASE", combined_env, "https://api.groq.com/openai/v1")
        or "https://api.groq.com/openai/v1",
        supabase_url=_read_setting("SUPABASE_URL", combined_env) or _read_setting("VITE_SUPABASE_URL", combined_env),
        supabase_anon_key=_read_setting("SUPABASE_ANON_KEY", combined_env)
        or _read_setting("VITE_SUPABASE_PUBLISHABLE_KEY", combined_env),
        supabase_service_role_key=_read_setting("SUPABASE_SERVICE_ROLE_KEY", combined_env),
    )
