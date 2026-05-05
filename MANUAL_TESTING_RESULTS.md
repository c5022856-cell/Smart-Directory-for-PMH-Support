# Manual Testing Results

Date: 2026-04-28

Scope: directory-first MATRIA workflow aligned to `developer only/plan.md`.

Status key: Pass, Fail, Blocked, Not Run.

## Environment

- Frontend: local Vite app, expected URL `http://localhost:8080`
- Backend: local FastAPI app, expected URL `http://127.0.0.1:8000`
- Database/auth: Supabase project configured through `.env`
- AI provider: Groq key configured through backend `.env`
- Verification method: headless browser pass using `developer only/headless_verify.mjs`
- Artifacts: `F:\PMH-backend+frontend\developer only\headless-qa`

## Manual QA Checklist

| ID | Area | Steps | Expected Result | Status | Notes |
| --- | --- | --- | --- | --- | --- |
| QA-01 | Landing copy | Open `/` and review hero, cards, quote, and lower information blocks. | Landing page describes MATRIA as a directory of services/resources, not a feelings-led support tool. | Pass | Verified in headless desktop and mobile runs. |
| QA-02 | Entry urgent-help block | Open `/entry` in options view. | Urgent-help block appears before guest/create-account options with 111, Samaritans, and EYUP details. | Pass | Verified in headless browser. |
| QA-03 | Language selector | Open landing, entry, header, and settings language controls. | Only six languages appear: English, Arabic, Polish, Hindi, Urdu, Tamil. | Pass | Verified selector list, runtime translations, and Urdu RTL. |
| QA-04 | Guest free-text flow | Open `/support-input`, choose the text route, and submit a short keyword search. | Page asks for resources, not feelings, and directory results match the keyword logic. | Pass | Verified with `anxiety Sheffield phone`. |
| QA-05 | Guided workflow | Open `/support-input`, choose the guided route, and go through both branches. | First question is Sheffield vs UK. Second question follows the correct branch options from the workflow. | Pass | Verified in headless browser. |
| QA-06 | Sheffield results | Choose Sheffield + each access branch. | Returned services align to Sheffield workflow services and access modes. | Pass | Verified branch outputs including phone/email, online, and social. |
| QA-07 | UK-wide results | Choose UK + each access branch. | Returned services align to UK-wide workflow services and access modes. | Pass | Verified branch outputs including email, phone, and online. |
| QA-08 | Skip behavior | Skip the resource finder, then open Dashboard and Support Directory. | Dashboard hides matched suggestions. Support Directory still allows full browse mode. | Pass | Verified in headless browser. |
| QA-09 | Booklet | Save and remove services from the directory and Settings booklet view. | Booklet continues to work with the updated service set. | Pass | Verified save and remove flow in headless browser. |
| QA-10 | Community and Settings | Open Community and Settings after the directory changes. | Both pages still load and behave normally. | Pass | Verified Settings load and Community post creation. |
| QA-11 | Chat de-scope | Open header navigation and try `/chat`. | Chat is not visible in the main navigation. `/chat` redirects into the directory flow. | Pass | Verified in headless browser. |

## Automated Checks

| Check | Command | Status | Notes |
| --- | --- | --- | --- |
| Frontend lint | `npm run lint` | Pass | Completed on 2026-04-28. |
| Frontend build | `npm run build` | Pass | Completed on 2026-04-28. |
| Backend compile | `python -m compileall app` | Pass | Completed on 2026-04-28. |
| Backend tests | `python -m unittest discover -s tests -v` | Pass | Completed on 2026-04-28. 9 tests passed. |
