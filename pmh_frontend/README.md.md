# MATRIA Frontend

This folder contains the React frontend for MATRIA.

## Frontend Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase client integration

## Current User-Facing Pages

- landing page
- entry and auth flow
- support input
- dashboard
- support directory
- community
- feedback
- settings
- AI support chat

The old Events page has been removed from the visible user flow.

## Key Frontend Features

- guest access and optional sign-in
- support input with AI analysis
- AI-ranked service suggestions
- support-directory description translation
- booklet save/view/remove flow
- multilingual UI
- runtime UI translation for Hindi, Tamil, Telugu, Urdu, Hausa, and Chinese
- markdown rendering in chat
- crisis-safe chat lock behavior

## Important Frontend Files

- `src/App.tsx`
- `src/contexts/LanguageContext.tsx`
- `src/contexts/AuthContext.tsx`
- `src/lib/ai.ts`
- `src/lib/booklet.ts`
- `src/pages/LandingPage.tsx`
- `src/pages/EntryPage.tsx`
- `src/pages/SupportInputPage.tsx`
- `src/pages/SupportDirectoryPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/ChatPage.tsx`

## Environment

Required frontend variable:

```env
VITE_AI_API_URL=http://127.0.0.1:8000
```

This frontend also expects the existing Supabase frontend env values to remain available for auth and profile access.

Before running the frontend, the client should open `pmh_frontend/.env` and make sure it contains the correct values for:

- `VITE_AI_API_URL`
- Supabase frontend variables used by the project

## Run Locally

```powershell
cd pmh_frontend
npm install
npm run dev
```

## Verification

Run:

```powershell
npm run lint
npm run build
npm test
```

## Notes

- Arabic and Polish use static UI translations
- Hindi, Tamil, Telugu, Urdu, Hausa, and Chinese use runtime translation plus local browser cache
- the backend must be running the first time those runtime languages are loaded
- the backend should have the client's real `GROQ_API_KEY` in `ai_backend/.env` if they want live Groq-backed AI behavior
- if new translation keys are added later, a hard refresh may be needed so the browser picks up the refreshed translation cache
