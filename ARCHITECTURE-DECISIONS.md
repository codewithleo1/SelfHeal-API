# Architecture Decision Records
### SelfHeal-API — Autonomous API Drift & Schema Remediation Agent

---

## What Is This File?

Every significant technical choice in this project is recorded here with three things:
1. **What** was decided
2. **What alternatives** were considered
3. **Why** this option was chosen

This is called an ADR — Architecture Decision Record. It exists because six months from now, "why did we do it this way?" is a harder question than "what does this code do?" This file answers the first question.

---

## ADR-001 — Primary LLM: Claude over GPT-4

**Date:** July 2026
**Status:** Active

**Decision:** Use Anthropic Claude (claude-sonnet-4-6) as the primary LLM for all agent reasoning and code generation tasks.

**Alternatives considered:**
- OpenAI GPT-4o — industry default, strong code generation, but no meaningful free tier for a portfolio project
- Gemini 1.5 Pro — Google's free tier exists but context window behavior on code tasks is less predictable
- Local models via Ollama — free and private, but hardware requirements make it unsuitable for a hosted SaaS demo

**Why Claude:**
- Free credits on signup cover the full development and demo period
- Claude's instruction-following on structured output (returning only JSON, or only a rewritten function) is more reliable than GPT-4o for the specific patterns this agent needs
- Anthropic's API has a clean Python SDK with streaming support
- Groq (Llama 3.1 70B) is configured as an automatic fallback, so Claude rate limits do not block the demo

---

## ADR-002 — Fallback LLM: Groq over other providers

**Date:** July 2026
**Status:** Active

**Decision:** Use Groq API (Llama 3.1 70B) as the automatic fallback when Claude hits rate limits.

**Alternatives considered:**
- OpenAI as fallback — paid, defeats the purpose of a fallback
- Ollama local — not viable in a hosted Railway environment
- No fallback — unacceptable for a live demo; one rate limit error would break the entire pipeline

**Why Groq:**
- Genuinely free forever tier: 14,400 requests/day
- Llama 3.1 70B is strong enough for the code patching task
- Groq's API is OpenAI-compatible — the `llm_client.py` abstraction layer switches providers by changing one parameter, no prompt changes needed

---

## ADR-003 — No LangChain

**Date:** July 2026
**Status:** Active

**Decision:** Build a custom agent loop in plain Python instead of using LangChain.

**Alternatives considered:**
- LangChain — the most popular agent framework, large ecosystem
- LlamaIndex — stronger on RAG/retrieval, less relevant here
- CrewAI — multi-agent framework, overkill for a 4-step linear pipeline

**Why custom loop:**
- The agent pipeline is a fixed 4-step linear sequence, not a dynamic tool-selecting loop. LangChain's abstractions solve a harder problem than the one we have.
- LangChain adds significant dependency weight and has a history of breaking API changes between versions
- A custom loop is easier to debug — every step is explicit Python, no framework magic to trace through
- Interviewers can read `detect.py → crawl.py → patch.py → pr.py` and understand the system in 5 minutes. A LangChain implementation requires knowing the framework first.

---

## ADR-004 — Job Queue: Upstash Redis over alternatives

**Date:** July 2026
**Status:** Active

**Decision:** Use Upstash Redis as the async job queue between the FastAPI web process and the agent worker.

**Alternatives considered:**
- PostgreSQL-backed queue (e.g. pg-boss pattern using Supabase) — no extra service needed, but polling a DB table is slower and puts unnecessary load on the free-tier Supabase instance
- Celery + Redis — Celery is the Python standard for task queues but requires a self-managed Redis instance; Upstash provides managed Redis with a free tier
- In-process background tasks (FastAPI `BackgroundTasks`) — simplest option, but tasks are lost if the server restarts, which happens frequently on Railway's free tier

**Why Upstash Redis:**
- Managed service — no infrastructure to run
- Free tier: 10,000 commands/day, sufficient for a demo-volume project
- HTTP-based Redis client works inside Railway's free tier without persistent connections
- Decouples the web process from the agent worker — the API returns a `job_id` instantly while the agent runs independently

---

## ADR-005 — Backend Hosting: Railway over Render

**Date:** July 2026
**Status:** Active

**Decision:** Deploy the FastAPI backend on Railway.

**Alternatives considered:**
- Render — similar free tier, strong reputation, but free tier spins down after 15 minutes of inactivity (cold start ~30 seconds). Unacceptable for a demo.
- Fly.io — generous free tier and no spin-down, but requires learning their CLI and deployment model; adds friction for a solo project
- Vercel serverless functions — cannot run a persistent background worker, which the Redis queue consumer requires
- Self-hosted VPS — out of scope for a free-tier portfolio project

**Why Railway:**
- Free tier provides 500 hours/month with no spin-down on the Hobby plan
- Dockerfile-based deploy — same config works locally and in production
- Environment variable management is clean via their dashboard
- Auto-deploy on push to `main` branch works out of the box

---

## ADR-006 — Database: Supabase over PlanetScale / Neon

**Date:** July 2026
**Status:** Active

**Decision:** Use Supabase (PostgreSQL) for the jobs database and session storage.

**Alternatives considered:**
- PlanetScale — MySQL-compatible, generous free tier, but row-level branching adds unnecessary complexity for a simple jobs table
- Neon — serverless PostgreSQL, good free tier, but less feature-complete dashboard for a solo developer managing migrations manually
- SQLite on Railway volume — simplest possible option but Railway free tier does not provide persistent volumes; data would be lost on redeploy

**Why Supabase:**
- PostgreSQL — the same database used in most production SaaS, so the schema knowledge transfers directly
- Free tier: 500MB, sufficient for job records and step logs at demo volume
- Built-in dashboard to inspect rows manually during development — invaluable for debugging agent output
- GitHub OAuth session storage is handled natively without a separate session service

---

## ADR-007 — API Versioning: /api/v1/ prefix from day one

**Date:** July 2026
**Status:** Active

**Decision:** All API routes are prefixed `/api/v1/` even though there is currently only one version.

**Alternatives considered:**
- No versioning — common in early-stage projects, creates breaking change risk later
- Header-based versioning (`API-Version: 1`) — cleaner URLs but harder to test in a browser and less visible in logs

**Why /api/v1/ from day one:**
- Zero cost to add now; expensive to retrofit later (every client integration breaks)
- Signals to anyone reading the codebase that the API is designed to evolve
- Standard practice in every production API (Stripe, Twilio, GitHub all use path versioning)

---

## ADR-008 — Input Validation: Pydantic everywhere

**Date:** July 2026
**Status:** Active

**Decision:** Every FastAPI route uses a Pydantic model for request body validation. No raw `dict` access.

**Alternatives considered:**
- Manual validation with `if` statements — error-prone, inconsistent, hard to read
- Marshmallow — popular Python serialization library, but redundant when FastAPI already has native Pydantic integration
- No validation — acceptable for a personal script, never acceptable for a web API

**Why Pydantic:**
- FastAPI's native integration means validation is automatic — invalid requests return a structured 422 error before any business logic runs
- Pydantic models double as documentation — the FastAPI auto-generated `/docs` page shows the exact expected schema for every endpoint
- Type safety in the agent pipeline — passing a `JobCreate` model instead of a raw dict catches field name typos at import time, not at runtime

---

## ADR-009 — Code Validation: Static analysis only, never execution

**Date:** July 2026
**Status:** Active

**Decision:** Patched code is validated using static analysis only (`ast.parse` for Python, `tsc --noEmit` for TypeScript). The patched code is never executed server-side.

**Alternatives considered:**
- Sandboxed execution (Docker-in-Docker or gVisor) — would allow runtime validation but introduces significant infrastructure complexity and security attack surface
- No validation — Claude's output could contain syntax errors that would make the PR useless
- LLM self-review (ask Claude to verify its own output) — useful as a secondary check but not a substitute for a deterministic parser

**Why static analysis only:**
- Eliminates the entire class of server-side code execution vulnerabilities
- `ast.parse()` is deterministic, fast, and cannot be tricked by adversarial input
- A PR with a syntax error is still a PR — the human reviewer will catch it; the agent's job is to produce the best possible patch, not guarantee it runs correctly in the target environment
- Keeps the security model simple: the server never runs user-influenced code

---

*Last updated: July 2026*
*Add a new ADR every time a significant technical decision is made. Never delete old ADRs — mark them Superseded and add a new one referencing the old.*
