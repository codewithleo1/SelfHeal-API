# SelfHeal-API — Project Progress Tracker
### Autonomous API Drift & Schema Remediation Agent
**Started:** July 2026 | **Target Launch:** August 2026 | **Solo Developer:** Suraj

---

## Overall Progress

```
Phase 0 — Standards & Scaffolding   [x] 100%
Phase 1 — Foundation                [x] 100%
Phase 2 — Agent Core                [x] 100%
Phase 3 — SaaS Layer                [x] 100%
Phase 4 — Deploy & Polish           [x] 100%

Total: [x] 100% Complete
```

> Update each `[ ]` to `[x]` as tasks are completed.
> Update percentages weekly.

---
### Phase 0 — Standards & Scaffolding (before Phase 1)
  - [x]  Sentry setup
  - [x]  GitHub Actions CI pipeline
  - [x]  Structured logging setup
  - [x]  CORS + rate limiting config
  - [x]  API versioning
  - [x]  Data retention policy document

## Phase 1 — Foundation & Project Setup
**Target:** Week 1 (Days 1–7)
**Goal:** Repo set up, GitHub OAuth working, basic UI shell live on Vercel

### Tasks

#### 1.1 Repository & Tooling
- [x] Create GitHub repo: `selfheal-api`
- [x] Initialize frontend: `npm create vite@latest frontend -- --template react-ts`
- [x] Initialize backend: `mkdir backend && cd backend && python -m venv venv`
- [x] Install backend deps: `fastapi uvicorn httpx python-dotenv supabase pydantic`
- [x] Set up `.env.example` with all required keys
- [x] Add `.gitignore` (exclude `.env`, `venv/`, `node_modules/`)
- [x] Write base `README.md` with project description

#### 1.2 GitHub OAuth
- [x] Create GitHub OAuth App in GitHub Developer Settings
- [x] Implement `/api/github/oauth` callback route in FastAPI
- [x] Exchange code for access token, store in Supabase session
- [x] Frontend: "Login with GitHub" button → redirect flow
- [x] Test: user can log in and see their GitHub username in UI

#### 1.3 Supabase Setup
- [x] Create Supabase project (free tier)
- [x] Run `jobs` table migration SQL
- [x] Run `agent_steps` table migration SQL
- [x] Test: FastAPI can insert and query a dummy job row

#### 1.4 Frontend Shell
- [x] Landing page with hero section and "Try Demo" CTA
- [x] Dashboard page (protected route — requires GitHub login)
- [ ] Job creation page (`/jobs/new`) with form fields:
  - Paste error log textarea
  - GitHub repo URL input
  - Submit button
- [ ] Deploy frontend to Vercel — confirm live URL works
- [ ] Deploy backend to Railway — confirm `/api/health` returns 200

**Phase 1 Done** 

---

## Phase 2 — Agent Core (The Hard Part)
**Target:** Week 2 (Days 8–14)
**Goal:** All 4 agent steps working end-to-end in a Python test script

### Tasks

#### 2.1 Step 1 — Detect (Log Analyzer)
- [x] Write `backend/app/agent/detect.py`
- [x] Write `llm_client.py` — LLMClient class with Claude primary + Groq fallback
- [x] Prompt Claude with: error log → extract endpoint, method, failing field
- [x] Return structured JSON: `{ endpoint, method, failing_field, vendor }`
- [x] Unit test with 3 sample error logs (Stripe, Twilio, generic REST)
- [x] Edge case: malformed/incomplete logs — return `{ status: "insufficient_data" }`

#### 2.2 Step 2 — Crawl (OpenAPI Fetcher + Differ)
- [x] Write `backend/app/agent/crawl.py`
- [x] Build vendor → OpenAPI URL lookup map (Stripe, Twilio, Shopify, etc.)
- [x] `httpx` fetch of OpenAPI spec URL
- [x] `jsondiff` between old schema (from repo type defs) and new spec
- [x] Claude summarizes the diff in plain English
- [x] Unit test with Stripe spec (public, stable URL)
- [x] Fallback: if no spec found → Claude extracts from vendor migration blog URL

#### 2.3 Step 3 — Patch (Code Rewriter)
- [x] Write `backend/app/agent/patch.py`
- [x] GitHub API: fetch raw file content from user's repo
- [x] Prompt Claude with: original code + diff summary + migration notes
- [x] Claude returns ONLY the rewritten function (not entire file)
- [x] Replace function in original file string using AST node replacement
- [x] Validate output: `ast.parse()` for Python, `tsc --noEmit` for TypeScript
- [x] Unit test with a sample broken Stripe payment mapper (Python)
- [x] Unit test with a sample broken Stripe payment mapper (TypeScript)

#### 2.4 Step 4 — PR Creator
- [x] Write `backend/app/agent/pr.py`
- [x] GitHub API: create branch `selfheal/fix-{endpoint}-{timestamp}`
- [x] GitHub API: push patched file to branch
- [x] Run lint: `subprocess.run(["ruff", "check", filepath], timeout=30)`
- [x] GitHub API: create Pull Request with full body (old schema, new schema, Claude's reasoning)
- [x] Unit test: PR actually appears in a test repo
- [x] Store PR URL in Supabase `jobs` table
#### 2.5 End-to-End Agent Test
- [x] Write `backend/tests/test_full_pipeline.py`
- [x] Run all 4 steps against a real test repo with a seeded broken file
- [x] Confirm: PR is opened, link is returned, all steps logged in `agent_steps` table

**Phase 2 Done**

---

## Phase 3 — SaaS Layer (Async + Live UI)
**Target:** Week 3 (Days 15–21)
**Goal:** Jobs run in background, UI shows live step-by-step progress

### Tasks

#### 3.1 Async Job Queue
- [ ] Set up Upstash Redis (free tier) — get URL + token
- [ ] Write `backend/app/queue/worker.py` — listens to Redis queue
- [ ] `POST /api/jobs` → enqueues job to Redis, returns `job_id` immediately
- [ ] Worker picks up job → runs agent steps → updates Supabase at each step
- [ ] Test: submit job, confirm it runs async, UI can poll for updates

#### 3.2 Live Progress UI
- [ ] `/jobs/{id}` page — polls `GET /api/jobs/{job_id}` every 2 seconds
- [ ] Step progress component: 4 steps with status indicators
  - ⏳ Pending → 🔄 Running → ✅ Done → ❌ Error
- [ ] Show step output text as each step completes
- [ ] Auto-redirect to `/jobs/{id}/result` when status = `completed`

#### 3.3 Result Page
- [ ] `/jobs/{id}/result` — shows:
  - GitHub PR link (clickable)
  - Schema diff (old vs new, color-coded)
  - Patched code snippet (syntax highlighted)
  - Claude's explanation of the fix
- [ ] "Run Another Job" button

#### 3.4 Dashboard
- [ ] `/dashboard` — table of all user's past jobs
- [ ] Columns: Date, Repo, Endpoint, Status, PR Link
- [ ] Clickable rows → go to result page

#### 3.5 Demo Mode (No GitHub Login Required)
- [ ] Pre-seed a demo job with a real completed result (Stripe example)
- [ ] Landing page "Try Demo" button → shows the result page without login
- [ ] This is what you show in interviews / portfolio

**Phase 3 Done When:** Full user flow works — submit → live progress → result page with PR link.

---

## Phase 4 — Deploy, Polish & Portfolio
**Target:** Week 4 (Days 22–28)
**Goal:** Live on internet, README perfect, demo data loaded, ready to show

### Tasks

#### 4.1 Production Deployment
- [x] Frontend: Vercel production deploy with custom env vars
- [x] Backend: Render production deploy (switched from Railway — free tier)
- [x] Supabase: run final migrations on production project
- [x] Upstash: confirm Redis queue working in production
- [x] End-to-end test on live URLs — submit a real job, get a real PR

#### 4.2 README Polish (This Is What Interviewers Read)
- [x] Project title + one-line description
- [x] Live demo link (prominent, top of README)
- [x] Architecture diagram
- [x] Tech stack table
- [x] How it works — 4 steps
- [x] Local development setup instructions
- [x] Environment variables documentation

#### 4.3 Demo Data & Reliability
- [ ] Load 3 pre-completed demo jobs in production DB (Stripe, Twilio, Shopify examples)
- [ ] Add loading states and error boundaries everywhere in UI
- [ ] Add graceful fallback if Claude API is slow (show "Agent thinking..." animation)
- [ ] Rate limiting confirmed working (Upstash)

#### 4.4 Portfolio Presentation
- [ ] Record a 2-minute Loom demo video — add to README
- [ ] Write a LinkedIn post explaining what the project does and why
- [x] Add to portfolio website / resume with live link
- [x] Tag with topics on GitHub repo: `ai-agent`, `llm`, `fastapi`, `react`, `autonomous-agent`

**Phase 4 Done When:** Live URL is shareable, README is clean, demo video is recorded.

---

## Key Decisions Log

| Date | Decision | Reason |
|---|---|---|
| Jul 2026 | Use Railway over Render | Better free tier for persistent background workers |
| Jul 2026 | Use Claude claude-sonnet-4-6 | Best balance of speed and reasoning for code tasks |
| Jul 2026 | No LangChain | Adds complexity; custom agent loop is more educational |
| Jul 2026 | Use Groq dual-key rotation instead of Claude | Anthropic requires paid credits; Groq free tier sufficient for dev |
| Jul 2026 | Use llama-3.3-70b-versatile | llama-3.1-70b-versatile was decommissioned by Groq |
| Jul 2026 | Use classic GitHub token for agent | Fine-grained tokens require explicit repo selection; classic token simpler for dev |
| Aug 2026 | Use Render over Railway for backend | Railway no longer has a genuinely free tier |

> Add a row here every time you make a significant technical decision.

---

## Blockers & Issues

| Date | Blocker | Status | Resolution |
|---|---|---|---|
| Jul 2026 | Groq model llama-3.1-70b-versatile decommissioned | Resolved | Switched to llama-3.3-70b-versatile |
| Jul 2026 | GitHub fine-grained token had no repo permissions | Resolved | Switched to classic token with repo scope |
| Jul 2026 | oxlint parser rejected emoji in TSX | Resolved | Removed emoji from JSX components |
| Jul 2026 | react-router-dom audit vulnerabilities | Resolved | SSR-only CVEs, not applicable to client-side app |

> Log any blockers here so you can reference them later.

---

## Resources & References

- Anthropic Claude API Docs: https://docs.anthropic.com
- GitHub REST API Docs: https://docs.github.com/en/rest
- Supabase Docs: https://supabase.com/docs
- Upstash Redis Docs: https://upstash.com/docs/redis
- FastAPI Docs: https://fastapi.tiangolo.com
- OpenAPI Stripe Spec: https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json
- Railway Deploy Docs: https://docs.railway.app
- Vercel Deploy Docs: https://vercel.com/docs

---

*Last updated: July 2026 | Update this doc every time you complete a phase.*
