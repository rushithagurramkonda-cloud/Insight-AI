# Insight AI: Frontend

React 18 + Vite + Tailwind CSS 3 + React Router + Recharts + lucide-react. Font: Inter.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

Open the app and click **Try demo mode**. Demo mode answers every request from `src/lib/demo.js`,
with no backend, GitHub, Gemini or MongoDB needed. It is the safest way to present the project.

To use a real backend, copy `.env.example` to `.env` and set `VITE_API_URL` (default `http://localhost:5000`).
Vite proxies `/api/*` and `/auth/*` to it, so cookies stay same-origin and no CORS setup is needed.

## Structure

```
src/
  App.jsx                 routes
  context/AppContext.jsx  session, demo mode, toasts, sidebar state, tour
  lib/api.js              the only place that calls the backend (switches to demo.js in demo mode)
  lib/demo.js             sample data + in-memory fake API (mirrors the real API shapes)
  lib/hooks.js            useFetch, copyText, formatDate
  lib/download.js, pdf.js PDF download (real: from backend, demo: tiny client-side PDF)
  components/ui.jsx       Card, Button, Badge, ScoreRing, Bar, Expandable, Modal, ConfirmDialog, ...
  components/Layout.jsx   sidebar, top bar, global search (Ctrl K), notifications, toasts, product tour
  pages/                  Landing, Login, Privacy, Dashboard, ResumeAnalysis, GithubAnalysis,
                          JobDescription, Comparison, JobMatch, Reports, Profile (+ Admin tab), ErrorPages
```

## What the backend must provide

The frontend calls exactly these endpoints (see the spec, section 9). Response shapes are shown by the
objects in `src/lib/demo.js`: build your API responses to match them.

| Area | Calls |
|---|---|
| Auth | `GET /auth/github?remember=0\|1` (OAuth redirect), `GET /auth/github?scope=repo` (private repos), `POST /auth/logout`, `GET /api/me` |
| Profile | `PATCH /api/me`, `DELETE /api/me/data`, `DELETE /api/me` |
| Resume | `GET/POST /api/resumes` (POST is multipart: `file`, optional `label`), `GET/PATCH/DELETE /api/resumes/:id`, `POST /api/resumes/:id/rerun`, `GET /api/resumes/:id/pdf` |
| GitHub | `POST /api/github-repositories/analyze` `{ target, includePrivate }`, `GET /api/github-repositories`, `GET /api/github-repositories/:id`, `GET /api/github-repositories/usage`, `GET /api/github-repositories/:id/pdf` |
| Jobs | `GET/POST /api/jobs` `{ title, company, level, name, rawText }`, `GET/PATCH/DELETE /api/jobs/:id`, `POST /api/jobs/:id/rerun`, `GET /api/jobs/:id/pdf` |
| Comparison | `POST /api/comparisons` `{ resumeId, githubAnalysisId }`, `GET /api/comparisons/:id/pdf` |
| Match | `POST /api/matches` `{ resumeId, githubAnalysisId, jobId, weights }`, `POST /api/matches/rank` `{ ..., jobIds }`, `GET /api/matches/:id/pdf` |
| Dashboard | `GET /api/dashboard` |
| Reports | `GET/POST /api/reports` `{ sections, resumeId, githubAnalysisId, jobId }`, `DELETE /api/reports/:id`, `GET /api/reports/:id/download` |
| Search / bell | `GET /api/search?q=`, `GET/PATCH /api/notifications` |
| Admin | `GET /api/admin/stats`, `GET/PATCH/DELETE /api/admin/users/:handle`, `GET /api/admin/analyses` |

A `401` from any call sends the user back to `/login`.

## Design tokens

Defined in `tailwind.config.js`: brand teal `#00404E`, lavender surface `#F5F6FC`, border `#E5E8F3`.
Status colors are used at ~10% opacity for boxes: green = verified, amber = partial, red = missing, gray = can't be verified.
