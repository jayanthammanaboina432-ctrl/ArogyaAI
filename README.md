# ArogyaAI

An AI-based healthcare system for diagnosis and patient care.

> ArogyaAI provides preliminary healthcare assistance and general information.
> It does not replace a qualified healthcare professional, provide confirmed
> diagnoses, or autonomously prescribe medicines.

## Status

**All 5 batches complete.** ArogyaAI implements the full project plan.

| Batch | Scope | State |
|---|---|---|
| 1 | Setup + Authentication + Dashboard | ✅ Done |
| 2 | Symptom Checker + Gemini Assessment + Medicine Guidance | ✅ Done |
| 3 | Hospital & Pharmacy Finder (MongoDB) | ✅ Done |
| 4 | AI Chatbot + Prescription Reader | ✅ Done |
| 5 | Emergency/SOS + Integration + Security + Final testing | ✅ Done |

## Tech stack

- **Frontend:** React + TypeScript + Vite + React Router
- **Backend:** Node.js + Express, `helmet` security headers, `express-rate-limit`
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT + bcrypt
- **AI:** Google Gemini API (`gemini-flash-latest`), schema-constrained JSON responses validated server-side

## Project structure

```
ArogyaAI/
  backend/    Node.js + Express API
  frontend/   React + TypeScript + Vite app
```

## Prerequisites

- Node.js 18+ (uses `node --watch`)
- A MongoDB instance (local `mongod` or MongoDB Atlas connection string)

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # then edit .env
npm run dev
```

`.env` values:

| Variable | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGODB_URI` | Mongo connection string |
| `MONGODB_DATABASE` | Database name (default `arogyaai`) |
| `JWT_SECRET` | Secret for signing JWTs — use a long random string |
| `JWT_EXPIRATION` | Token lifetime (e.g. `7d`) |
| `GEMINI_API_KEY` | Google Gemini API key (from Google AI Studio). Without it, AI endpoints return `503`. Free tier is capped at 20 requests/day **per model** — see [AI quota limits](#ai-quota-limits) below. |
| `GEMINI_MODEL` | Gemini model id (default `gemini-flash-latest`) |
| `FRONTEND_URL` | Allowed CORS origin (default `http://localhost:5173`) |
| `EMERGENCY_SERVICE_NUMBER` | Number dialed by "Call Emergency Service" (default `112`) |
| `EMERGENCY_CONTACT_NUMBER` | Number dialed by "Call Emergency Contact" (blank hides that button) |

The server exits with an error if `MONGODB_URI` is missing. The Gemini key is
read only on the backend — it is never sent to or bundled with the React app.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. In dev, Vite proxies `/api` to the backend on port 5000.

### 3. Seed sample hospitals & pharmacies (Batch 3)

```bash
cd backend
npm run seed
```

Replaces the `healthcare_places` collection with ~18 sample hospitals and
pharmacies across Hyderabad, Bengaluru, Mumbai, and Delhi so the Hospital &
Pharmacy Finder has data to search.

## API

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | no | Service health check (`aiConfigured` flag) |
| POST | `/api/auth/register` | no | Create account → `{ token, user }` |
| POST | `/api/auth/login` | no | Log in → `{ token, user }` |
| GET | `/api/auth/me` | Bearer | Current user → `{ user }` |
| POST | `/api/symptoms/analyze` | Bearer | `{ symptoms }` → `{ assessment }` preliminary, non-diagnostic |
| GET | `/api/medicines/search?query=` | Bearer | Symptom/condition (e.g. "fever") → `{ result }` commonly used medicines |
| GET | `/api/healthcare/search?city=&type=` | Bearer | `type` is `hospital`, `pharmacy`, or `all` (default) → `{ results[] }` |
| GET | `/api/healthcare/:id` | Bearer | → `{ place }` single hospital/pharmacy record |
| POST | `/api/chat` | Bearer | `{ message, sessionId? }` → `{ sessionId, reply }` |
| GET | `/api/chat/sessions` | Bearer | → `{ sessions[] }` for the current user |
| GET | `/api/chat/sessions/:id` | Bearer | → `{ session, messages[] }` |
| POST | `/api/prescriptions/analyze` | Bearer | `multipart/form-data`, field `image` → `{ extracted }` |
| GET | `/api/emergency/config` | Bearer | → `{ emergencyServiceNumber, emergencyContactNumber }` |

`/api/auth/register` and `/api/auth/login` are rate-limited (20 attempts /
15 min per IP). `/api/symptoms/analyze`, `/api/medicines/search`, `/api/chat`,
and `/api/prescriptions/analyze` are rate-limited (10 requests / minute per
user) to protect the shared Gemini quota from being burned by one client.

### `assessment` shape
`possibleCondition`, `symptomsConsidered[]`, `generalGuidance`, `urgencyNote`, `disclaimer`.
Gemini is asked for schema-constrained JSON; the backend re-validates every field
before responding, and returns `502` if the shape is wrong, `503` if the AI service
is unavailable or unconfigured.

### Medicine guidance
Input is a **symptom or condition** (not a medicine name) — e.g. "fever" returns
commonly used OTC medicine types with real brand examples (e.g. Paracetamol —
Dolo 650, Crocin), purpose, precautions, and a "when to see a doctor" note. No
dosage or "take this" instruction is ever generated — informational only.

### Healthcare finder
Backed entirely by MongoDB (`healthcare_places` collection, no external maps
API). City matching is case-insensitive and whitespace-trimmed via a
normalized `cityKey` field, indexed together with `type`; it also matches a
locality named in the address (e.g. "Uppal", "Gachibowli") so area-level
searches still find the right city's hospitals/pharmacies. Pharmacies always
show "Please contact the pharmacy to confirm medicine availability."

### AI chatbot
Freeform conversation via `generateText` (no JSON schema — this is open Q&A).
A fixed system instruction enforces the plan's safety rules (no diagnosis, no
dosage instructions, redirect emergencies to professional care); verified live
that asking it to "diagnose me and prescribe a dose" gets refused and redirected.
Sessions and messages persist to `chat_sessions` / `chat_messages`, but a new
session is only saved to the database once Gemini actually replies — so a
failed first message never leaves an empty orphan session.

### Prescription reader
Image upload via `multipart/form-data` (`multer`, memory storage, 5MB limit,
JPEG/PNG/WEBP only). The image is sent to Gemini as inline multimodal data
alongside a schema-constrained prompt that forbids inventing text — any
field that isn't clearly legible comes back as exactly
`"Text unclear / unable to confidently read."` The uploaded image itself is
never persisted; only the extracted fields are saved to `prescription_records`
for audit purposes.

### Emergency / SOS
No collection needed — both numbers are configured via environment variables
(`EMERGENCY_SERVICE_NUMBER`, `EMERGENCY_CONTACT_NUMBER`) so they can be
changed per deployment/region without a code change. The page itself is
deliberately minimal: one big call button, no forms, no typing required.

## AI quota limits

Google's Gemini free tier caps each **project + model** combination at **20
generateContent requests per day** (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`).
Heavy testing across symptoms, medicines, chat, and prescriptions can burn
through that quickly — when it's exhausted, Gemini returns `429
RESOURCE_EXHAUSTED`, which the backend converts to a clean `503 AI service is
temporarily unavailable` instead of crashing or leaking the raw error.

If you hit this:
- Wait for the daily quota to reset, or
- Enable billing on the Google AI Studio / Cloud project for higher limits, or
- Point `GEMINI_MODEL` at a different model id — each model tracks its own
  separate free-tier quota, so switching (e.g. `gemini-flash-latest` ↔
  another current model) unblocks you immediately without waiting.

This is a genuine external limit, not a bug — the app's error handling around
it (graceful `503`s, per-user rate limiting) is intentional so quota
exhaustion degrades cleanly instead of behaving unpredictably.

## Frontend routes

| Route | Access |
|---|---|
| `/` | Public (redirects to `/dashboard` when logged in) |
| `/register` | Public |
| `/login` | Public |
| `/dashboard` | Protected |
| `/symptoms` | Protected — symptom entry form |
| `/symptoms/result` | Protected — assessment result (redirects to `/symptoms` if opened directly) |
| `/medicines` | Protected — medicine guidance search |
| `/healthcare-finder` | Protected — hospital & pharmacy search by city |
| `/chat` | Protected — AI healthcare chatbot |
| `/prescription` | Protected — prescription/image reader |
| `/emergency` | Protected — Emergency / SOS |

Every protected page's header includes "← Back to Dashboard"; protected
routes redirect to `/login` when logged out.

## Security notes

- Passwords hashed with bcrypt (salt rounds 10); plaintext is never stored.
- JWT sent as `Authorization: Bearer <token>`; token stored in `localStorage`.
- Duplicate email rejected at the application layer and by a unique index.
- Input validation on all endpoints; user-facing errors only, never stack traces.
- `helmet` sets standard security headers (`X-Content-Type-Options`, etc.) and
  hides `X-Powered-By`.
- Rate limiting: auth endpoints (brute-force protection) and every AI-backed
  endpoint (quota protection) — see the API table above.
- File uploads (`multer`): JPEG/PNG/WEBP only, 5MB max, memory storage (never
  written to disk), the image itself is discarded after analysis.
- CORS restricted to `FRONTEND_URL`.
- `GEMINI_API_KEY` is used only in `backend/src/services/gemini.js`; it is not
  referenced anywhere in `frontend/` (verify with `grep -r GEMINI frontend/src`).
- Secrets live in `backend/.env`, which is git-ignored. Only `.env.example` is
  committed — confirmed no `.env` has ever been committed to this repo's history.
- Emergency numbers are configurable via environment variables, not hardcoded.

## Tests

```bash
cd backend
npm test        # runs test/auth.smoke.mjs + batch2 + batch3 + batch4 + batch5
```

Uses `mongodb-memory-server` (no live DB needed) — **63 checks**: auth flow,
bcrypt hashing, symptom/medicine auth + validation, graceful degradation when
Gemini is unconfigured, healthcare search (city case/whitespace handling, type
filters, no-results, bad-id handling), chat validation + session 404 handling,
prescription upload validation (missing file, bad type, oversized file), and
emergency config + security headers + rate limiting.

## Manual test checklist

**Batch 1**
- [ ] Register / duplicate email / valid login / wrong password / protected route / logout
- [ ] Backend logs "MongoDB connected"; dashboard shows all six service cards

**Batch 2**
- [ ] `/symptoms` — empty input shows "Please enter at least one symptom."
- [ ] Valid symptoms → result page with condition, symptoms considered, guidance, disclaimer
- [ ] Result page is clearly labelled preliminary / not a diagnosis
- [ ] Next-action buttons (Medicine Guidance, Find Hospital, Ask Chatbot, Dashboard) work
- [ ] `/medicines` — searching a condition (e.g. "fever") returns commonly used medicines
- [ ] With `GEMINI_API_KEY` blank, AI pages show "AI service is temporarily unavailable"
- [ ] `grep -r GEMINI frontend/src` returns nothing

**Batch 3**
- [ ] `npm run seed` populates `healthcare_places`
- [ ] `/healthcare-finder` — search "Hyderabad" with Hospitals → results
- [ ] Same city with Pharmacies → different results, each showing "Please contact the pharmacy..."
- [ ] "All" → both combined
- [ ] Case-insensitive / extra-spaces city ("  hYderabad  ") still matches
- [ ] Unknown city → "No hospitals or pharmacies found for ..."
- [ ] Call / Call Pharmacy buttons are `tel:` links
- [ ] No Google Maps or Directions anywhere in the UI

**Batch 4**
- [ ] `/chat` — normal question gets a relevant, concise reply
- [ ] Empty message is blocked client-side
- [ ] Asking it to diagnose / give a dosage → it refuses and redirects to a professional
- [ ] With `GEMINI_API_KEY` blank, chat shows "AI service is temporarily unavailable"
- [ ] `/prescription` — valid image → Medicine / Dosage / Frequency / Instructions / Doctor-Hospital shown
- [ ] Unsupported file type (e.g. `.txt`) rejected before upload
- [ ] Oversized file (>5MB) rejected with a clear message
- [ ] A non-prescription or blank image → "The image could not be read. Please upload a clearer image."
- [ ] "Upload Another" resets the form; "Medicine Guidance" and "Back to Dashboard" work

**Batch 5**
- [ ] Dashboard's Emergency/SOS card is a live red-accented link (not "coming soon")
- [ ] `/emergency` shows one big "Call Emergency Service" button (`tel:` link, number from `.env`)
- [ ] Setting `EMERGENCY_CONTACT_NUMBER` in `.env` makes "Call Emergency Contact" appear
- [ ] "Find Hospital" and "Back to Dashboard" work from the emergency page
- [ ] Repeated failed logins (>20 in 15 min) get a 429 "Too many attempts" response
- [ ] Repeated AI requests (>10/min from one user) get a 429, protecting the shared Gemini quota
- [ ] Response headers include `helmet` protections; `X-Powered-By` is absent
- [ ] No `.env` file exists anywhere in git history (`git log --all --diff-filter=A --name-only | grep .env`)

## Final acceptance criteria (per the project plan)

- [x] Registration, Login, JWT authentication
- [x] Dashboard with all six services
- [x] Text symptom input + Gemini preliminary assessment + result page
- [x] Medicine Guidance
- [x] City-based hospital search + pharmacy search, backed by MongoDB
- [x] Call pharmacy action
- [x] Gemini AI Chatbot
- [x] Prescription image upload + processing
- [x] Emergency / SOS
- [x] Error handling (user-friendly messages, no stack traces)
- [x] Loading states on every async action
- [x] Responsive UI
- [x] Secure API key handling (backend-only, git-ignored)
- [x] MongoDB connection
- [x] API testing (63 automated checks) + manual checklists above
- [x] Frontend testing (`tsc -b && vite build` clean on every batch)
- [x] Complete README (this file)
