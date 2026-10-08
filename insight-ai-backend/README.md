# Insight AI: Backend

Node 18+ · Express · MongoDB Atlas (Mongoose) · Gemini · GitHub OAuth · PDFKit.
Built to match the frontend exactly: **no frontend changes are needed**. Every route returns the same JSON shapes as
the frontend's `src/lib/demo.js`, and `npm test` checks that automatically.

## 1. Set up (about 20 minutes)

```bash
cd insight-ai-backend
npm install
cp .env.example .env      # then fill it in, see below
npm run dev               # http://localhost:5000
```

### MongoDB Atlas
1. Create a free M0 cluster. Under **Database Access** create a user. Under **Network Access** allow your IP.
2. **Connect > Drivers**, copy the string into `MONGODB_URI` (add a database name like `/insightai`).
3. The server exits with a clear hint if it cannot connect. If you see `querySrv ECONNREFUSED`, your Wi-Fi blocks SRV DNS
   (common on campus). Use Atlas's non-SRV string, switch DNS to 8.8.8.8, or use a hotspot.

### GitHub OAuth app (https://github.com/settings/developers > New OAuth App)
- Homepage URL: `http://localhost:5173`
- **Authorization callback URL: `http://localhost:5173/auth/github/callback`** (the FRONTEND port, not 5000).
  The Vite dev server proxies `/auth` and `/api` to this backend, so the login cookie is set on the frontend origin.
- Put the Client ID and a generated Client Secret in `.env`.

### Other `.env` values
- `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `GEMINI_API_KEY` and `GEMINI_MODEL`: use the model name your existing Gemini code already uses if it differs from the default.
- `ADMIN_GITHUB_USERNAMES`: your GitHub username, so you get the Admin role at login.

### Run with the frontend
Terminal 1: `npm run dev` here. Terminal 2: `npm run dev` in the frontend folder (its `.env` can stay at
`VITE_API_URL=http://localhost:5000`). Open http://localhost:5173, click **Continue with GitHub**.
Do **not** click "Try demo mode" when testing the real backend.

## 2. What is implemented

| Area | Routes |
|---|---|
| Auth | `GET /auth/github`, `GET /auth/github/callback`, `POST /auth/logout`, `GET/PATCH/DELETE /api/me`, `DELETE /api/me/data` |
| Resumes | `GET/POST /api/resumes`, `GET/PATCH/DELETE /api/resumes/:id`, `POST …/rerun`, `GET …/pdf` |
| GitHub | `POST /api/github-repositories/analyze`, `GET /api/github-repositories`, `GET …/:id`, `GET …/usage`, `GET …/:id/pdf` |
| Jobs | `GET/POST /api/jobs`, `GET/PATCH/DELETE /api/jobs/:id`, `POST …/rerun`, `GET …/pdf` |
| Comparison | `POST /api/comparisons`, `GET …/:id`, `GET …/:id/pdf` |
| Match | `POST /api/matches`, `POST /api/matches/rank`, `GET …/:id/pdf` |
| Dashboard etc. | `GET /api/dashboard`, `GET/PATCH /api/notifications`, `GET /api/search` |
| Reports | `GET/POST /api/reports`, `GET …/:id/download`, `DELETE …/:id` |
| Admin | `GET /api/admin/stats|users|analyses`, `PATCH/DELETE /api/admin/users/:handle` |

## 3. How it works (the parts worth knowing)

- **Auth:** GitHub OAuth, state-checked. Session is a JWT in an httpOnly cookie (30 days with "Remember me", otherwise a
  session cookie). The GitHub token is stored AES-256-GCM encrypted and never sent to the browser. **Every `/api` route
  requires login**, including `/api/github-repositories/analyze`. `/api/admin/*` also requires the admin role.
- **Gemini calls:** only in `src/services/gemini.js` (server side). JSON-only output, one retry, clear error on quota/timeout.
  User text is wrapped in `<data>` tags with an injection warning. `src/services/normalize.js` forces every reply into the
  exact shape the frontend expects, so malformed AI output cannot crash a page.
- **Computed on the server, not by the AI:** match overall score (weighted average, weights normalized to 100), consistency
  counts, language percentages, commit cadence, doc coverage, CI/test detection, quality scores, dashboard coverage.
- **GitHub analysis:** top 5 original repos (set `GITHUB_MAX_REPOS`), reads README, dependency files, CI and test folders.
  15 analyses per user per day (`GITHUB_DAILY_LIMIT`), reserved atomically and refunded if the analysis fails. Saved results
  open from the database. The Analyze/Re-run button always runs fresh, except a repeat within 60 seconds returns the saved
  result for free (double-click protection). It runs synchronously (the frontend waits) and posts a notification when done.
- **Ownership:** every query filters by `userId`; other users' ids return 404.
- **Reports:** PDFKit, formal academic style, saved to `storage/reports/`. A report that includes a section with no data yet
  (for example no Job Match) returns a friendly 400 telling the user what to run first.
- **GitHub errors** are returned as 404/429/502, never 401, because the frontend logs the user out on any 401.

## 4. Tests

```bash
npm test
```
Runs the real Express app and real route code against an in-memory fake of the database layer, with Gemini and GitHub
mocked (no MongoDB binary or API keys needed). It covers auth, uploads, ownership, limits, scoring, PDFs and admin,
and compares every response shape with the frontend's `demo.js` when the frontend folder sits next to this one.

**Not covered by the automated test** (needs your real keys): the live GitHub OAuth redirect round trip, real Mongoose/Atlas
behavior, and real Gemini output quality. Do one manual pass through the app after setup.

## 5. Troubleshooting
- **Login loops back to /login?error=state** : the OAuth callback URL is not `http://localhost:5173/auth/github/callback`.
- **401 right after login** : you opened the app on a different port than 5173, so the cookie is on another origin.
- **AI errors (502 "rejected the request")** : wrong `GEMINI_API_KEY` or `GEMINI_MODEL`.
- **GitHub "rate limit reached"** : add a `GITHUB_TOKEN` (no scopes needed) for public lookups.
