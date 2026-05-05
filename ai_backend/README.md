# MATRIA AI Backend

This folder contains the FastAPI backend used by the MATRIA frontend.

The main project overview is in the repository root:

- [`README.md`](../README.md)

## Current Role

This backend currently supports the active directory workflow:

- analyze short free-text resource requests
- rank Sheffield and UK-wide services
- translate UI/runtime copy and service descriptions
- store local SQLite data for services, requests, translations, events, and community posts

The chatbot endpoint still exists for compatibility, but chatbot work is not part of the current client-facing scope.

## Main Files

- `app/main.py`
- `app/routes/analyze.py`
- `app/routes/recommend.py`
- `app/routes/translate.py`
- `app/routes/chat.py`
- `app/services/analyzer.py`
- `app/services/recommender.py`
- `app/services/translator.py`
- `app/services/chatbot.py`
- `app/clients/sqlite_store.py`
- `app/clients/groq_client.py`

## Local Data

Default local database:

- `data/matria_ai.db`

Main SQLite tables:

- `services`
- `support_requests`
- `translation_cache`
- `events`
- `community_posts`

## Environment

Example file:

- `.env.example`

Before running this backend, create or update `ai_backend/.env` and paste in the real environment values.

Required for Groq-backed behavior:

- `GROQ_API_KEY`

Common values:

```env
AI_DATABASE_PATH=./data/matria_ai.db
AI_REQUEST_TIMEOUT_SECONDS=10
AI_CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8080,http://localhost:8080
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
GROQ_API_BASE=https://api.groq.com/openai/v1
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Run Locally

```powershell
cd ai_backend
python -m uvicorn app.main:app --reload --port 8000
```

Docs UI:

- `http://127.0.0.1:8000/docs`

If `GROQ_API_KEY` is missing, Groq-backed features fall back where possible.

## API Endpoints

- `GET /`
- `GET /health`
- `POST /analyze/input`
- `POST /recommend/services`
- `POST /recommend/events`
- `POST /translate`
- `POST /chat`

## Verification

```powershell
python -m compileall app
python -m unittest discover -s tests -v
```

## Notes

- Translation cache writes use WAL mode, busy timeout, and a write lock.
- Service ranking is currently aligned to the Sheffield vs UK workflow and keyword-based matching.
- Restart the backend after service-seed changes so the active directory data is applied to SQLite.
