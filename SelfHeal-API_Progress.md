# SelfHeal-API — Project Progress Tracker
### Autonomous API Drift & Schema Remediation Agent
**Started:** July 2026 | **Target Launch:** August 2026 | **Solo Developer:** Suraj

---

## Overall Progress

```
Phase 1 — Foundation        [ ] 0%
Phase 2 — Agent Core        [ ] 0%
Phase 3 — SaaS Layer        [ ] 0%
Phase 4 — Deploy & Polish   [ ] 0%

Total: [ ] 0% Complete
```

> Update each `[ ]` to `[x]` as tasks are completed.
> Update percentages weekly.

---
### Phase 0 — Standards & Scaffolding (before Phase 1)
  - Sentry setup
  - GitHub Actions CI pipeline
  - Structured logging setup
  - CORS + rate limiting config
  - API versioning
  - Data retention policy document

## Phase 1 — Foundation & Project Setup
**Target:** Week 1 (Days 1–7)
**Goal:** Repo set up, GitHub OAuth working, basic UI shell live on Vercel

### Tasks

#### 1.1 Repository & Tooling
- [ ] Create GitHub repo: `selfheal-api`
- [ ] Initialize frontend: `npm create vite@latest frontend -- --template react-ts`
- [ ] Initialize backend: `mkdir backend && cd backend && python -m venv venv`
- [ ] Install backend deps: `fastapi uvicorn httpx python-dotenv supabase pydantic`
- [ ] Set up `.env.example` with all required keys
- [ ] Add `.gitignore` (exclude `.env`, `venv/`, `node_modules/`)
- [ ] Write base `README.md` with project description

#### 1.2 GitHub OAuth
- [ ] Create GitHub OAuth App in GitHub Developer Settings
- [ ] Implement `/api/github/oauth` callback route in FastAPI
- [ ] Exchange code for access token, store in Supabase session
- [ ] Frontend: "Login with GitHub" button → redirect flow
- [ ] Test: user can log in and see their GitHub username in UI

#### 1.3 Supabase Setup
- [ ] Create Supabase project (free tier)
- [ ] Run `jobs` table migration SQL
- [ ] Run `agent_steps` table migration SQL
- [ ] Test: FastAPI can insert and query a dummy job row

#### 1.4 Frontend Shell
- [ ] Landing page with hero section and "Try Demo" CTA
- [ ] Dashboard page (protected route — requires GitHub login)
- [ ] Job creation page (`/jobs/new`) with form fields:
  - Paste error log textarea
  - GitHub repo URL input
  - Submit button
- [ ] Deploy frontend to Vercel — confirm live URL works
- [ ] Deploy backend to Railway — confirm `/api/health` returns 200

**Phase 1 Done When:** User can log in with GitHub, fill the form, and the job is saved to Supabase with status `queued`.

---

## Phase 2 — Agent Core (The Hard Part)
**Target:** Week 2 (Days 8–14)
**Goal:** All 4 agent steps working end-to-end in a Python test script

### Tasks

#### 2.1 Step 1 — Detect (Log Analyzer)
- [ ] Write `backend/app/agent/detect.py`
- [ ] Write `llm_client.py` — LLMClient class with Claude primary + Groq fallback
- [ ] Prompt Claude with: error log → extract endpoint, method, failing field
- [ ] Return structured JSON: `{ endpoint, method, failing_field, vendor }`
- [ ] Unit test with 3 sample error logs (Stripe, Twilio, generic REST)
- [ ] Edge case: malformed/incomplete logs — return `{ status: "insufficient_data" }`

#### 2.2 Step 2 — Crawl (OpenAPI Fetcher + Differ)
- [ ] Write `backend/app/agent/crawl.py`
- [ ] Build vendor → OpenAPI URL lookup map (Stripe, Twilio, Shopify, etc.)
- [ ] `httpx` fetch of OpenAPI spec URL
- [ ] `jsondiff` between old schema (from repo type defs) and new spec
- [ ] Claude summarizes the diff in plain English
- [ ] Unit test with Stripe spec (public, stable URL)
- [ ] Fallback: if no spec found → Claude extracts from vendor migration blog URL

#### 2.3 Step 3 — Patch (Code Rewriter)
- [ ] Write `backend/app/agent/patch.py`
- [ ] GitHub API: fetch raw file content from user's repo
- [ ] Prompt Claude with: original code + diff summary + migration notes
- [ ] Claude returns ONLY the rewritten function (not entire file)
- [ ] Replace function in original file string using AST node replacement
- [ ] Validate output: `ast.parse()` for Python, `tsc --noEmit` for TypeScript
- [ ] Unit test with a sample broken Stripe payment mapper (Python)
- [ ] Unit test with a sample broken Stripe payment mapper (TypeScript)

#### 2.4 Step 4 — PR Creator
- [ ] Write `backend/app/agent/pr.py`
- [ ] GitHub API: create branch `selfheal/fix-{endpoint}-{timestamp}`
- [ ] GitHub API: push patched file to branch
- [ ] Run lint: `subprocess.run(["ruff", "check", filepath], timeout=30)`
- [ ] GitHub API: create Pull Request with full body (old schema, new schema, Claude's reasoning)
- [ ] Unit test: PR actually appears in a test repo
- [ ] Store PR URL in Supabase `jobs` table

#### 2.5 End-to-End Agent Test
- [ ] Write `backend/tests/test_full_pipeline.py`
- [ ] Run all 4 steps against a real test repo with a seeded broken file
- [ ] Confirm: PR is opened, link is returned, all steps logged in `agent_steps` table

**Phase 2 Done When:** Running `python test_full_pipeline.py` opens a real GitHub PR.

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
- [ ] Frontend: Vercel production deploy with custom env vars
- [ ] Backend: Railway production deploy with all secrets set
- [ ] Supabase: run final migrations on production project
- [ ] Upstash: confirm Redis queue working in production
- [ ] End-to-end test on live URLs — submit a real job, get a real PR

#### 4.2 README Polish (This Is What Interviewers Read)
- [ ] Project title + one-line description
- [ ] Live demo link (prominent, top of README)
- [ ] Architecture diagram (screenshot or Mermaid diagram)
- [ ] Tech stack badges
- [ ] "How it works" — 4 numbered steps with screenshots
- [ ] "Financial impact" section (use the numbers from the brief)
- [ ] Local development setup instructions
- [ ] Environment variables documentation

#### 4.3 Demo Data & Reliability
- [ ] Load 3 pre-completed demo jobs in production DB (Stripe, Twilio, Shopify examples)
- [ ] Add loading states and error boundaries everywhere in UI
- [ ] Add graceful fallback if Claude API is slow (show "Agent thinking..." animation)
- [ ] Rate limiting confirmed working (Upstash)

#### 4.4 Portfolio Presentation
- [ ] Record a 2-minute Loom demo video — add to README
- [ ] Write a LinkedIn post explaining what the project does and why
- [ ] Add to portfolio website / resume with live link
- [ ] Tag with topics on GitHub repo: `ai-agent`, `llm`, `fastapi`, `react`, `autonomous-agent`

**Phase 4 Done When:** Live URL is shareable, README is clean, demo video is recorded.

---

## Key Decisions Log

| Date | Decision | Reason |
|---|---|---|
| Jul 2026 | Use Railway over Render | Better free tier for persistent background workers |
| Jul 2026 | Use Claude claude-sonnet-4-6 | Best balance of speed and reasoning for code tasks |
| Jul 2026 | No LangChain | Adds complexity; custom agent loop is more educational |
| — | — | — |

> Add a row here every time you make a significant technical decision.

---

## Blockers & Issues

| Date | Blocker | Status | Resolution |
|---|---|---|---|
| — | — | — | — |

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
