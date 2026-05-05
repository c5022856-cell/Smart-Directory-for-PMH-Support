# MATRIA

MATRIA is a React frontend plus FastAPI backend for a perinatal mental health services directory.

The current client-facing direction is directory-first:

- six app languages only: English, Arabic, Polish, Hindi, Urdu, Tamil
- urgent-help information before guest or account entry
- guest search by short keywords or by the Sheffield vs UK workflow
- service directory, booklet, Community, Feedback, and Settings
- chatbot work is out of current scope and not part of the visible flow

## Repository Structure

- `pmh_frontend/`: React, Vite, Tailwind, Supabase frontend integration
- `ai_backend/`: FastAPI API, Groq integration, SQLite directory/cache storage
- `developer only/`: internal planning and testing notes
- `run_all.bat`, `run_all.ps1`: start frontend and backend together

## Current Product Scope

User-facing features:

- landing page aligned to the directory/resource positioning
- entry page with urgent-help block
- guest access and optional account creation
- keyword search for services/resources
- guided Sheffield vs UK resource workflow
- service directory with matched results and full browse mode
- booklet/favourites
- community page
- feedback page
- settings page

Not in current scope:

- new chatbot work
- user-facing Events flow

## Frontend

Main routes:

- `/`
- `/entry`
- `/support-input`
- `/dashboard`
- `/support`
- `/community`
- `/feedback`
- `/settings`
- `/admin`

Compatibility redirects:

- `/chat` redirects to `/support`
- `/events` redirects to `/dashboard`
- `/calls` redirects to `/dashboard`
- `/profile` redirects to `/settings`
- `/onboarding` redirects to `/support-input`

## Backend

Main API routes:

- `GET /`
- `GET /health`
- `POST /analyze/input`
- `POST /recommend/services`
- `POST /recommend/events`
- `POST /translate`
- `POST /chat`

Current backend responsibilities:

- keyword-based analysis of free-text directory requests
- ranking Sheffield and UK-wide services
- translation for UI/runtime copy and service descriptions
- local SQLite storage for services, support requests, translations, events, and community data

## Service Workflow

The active guided flow is:

1. Choose `Support Available in Sheffield` or `Support Available in the UK`
2. If Sheffield:
   - `Contact Services by (Phone or Email)`
   - `In Your Own Pace (Online)`
   - `Social Media`
3. If UK-wide:
   - `Email`
   - `Phone`
   - `Online`

The seeded directory is aligned to the named services in the active plan, including:

- Sheffield services such as No Panic CB Therapy, Talking Therapies Sheffield, Roshini Sheffield, Sheffield Mind, Sheffield Flourish, Bird Mind, Peanuts, Mat Exp, and others
- UK-wide services such as BACP, CRY-SIS, Women's Aid, Mind, and Right Decisions Maternal Health Tool-Kit

## Environment Variables

### Backend

Example file:

- `ai_backend/.env.example`

Before running the backend, the client must create or update `ai_backend/.env` and paste in their own real values.

At minimum, confirm these are set:

- `GROQ_API_KEY`
- `GROQ_MODEL` if a different Groq model is required
- `AI_CORS_ORIGINS`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Common backend variables:

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

### Frontend

Before running the frontend, confirm `pmh_frontend/.env` contains the correct values for this environment.

At minimum:

```env
VITE_AI_API_URL=http://127.0.0.1:8000
```

If the frontend is using Supabase auth in this environment, also confirm the client has pasted the correct Supabase frontend values into `pmh_frontend/.env`.

## Run Locally

### Backend

```powershell
cd ai_backend
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```powershell
cd pmh_frontend
npm install
npm run dev
```

### Start Both

From the repository root:

```powershell
.\run_all.bat
```

If PowerShell execution policy blocks `run_all.ps1`, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\run_all.ps1
```

## Verification

Frontend:

- `npm run lint`
- `npm run build`

Backend:

- `python -m compileall app`
- `python -m unittest discover -s tests -v`

## Notes

- The runtime non-English UI translation path depends on the backend being available on first load.
- Restart the backend after seed-data changes so SQLite is refreshed with the active directory services.
- The landing images are still heavy and remain the main frontend asset cost.
