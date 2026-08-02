# SelfHeal-API

**Autonomous AI agent that detects API schema drift, patches your client code, and opens a GitHub PR — without human intervention.**

🔗 **Live Demo:** [self-heal-api.vercel.app](https://self-heal-api.vercel.app)

---

## The Problem

Third-party APIs (Stripe, Twilio, Shopify) release breaking changes. Your integration breaks at 2am. An engineer spends hours tracking down which field was renamed, finding the right docs, rewriting the mapper, and opening a PR.

SelfHeal-API eliminates that entire loop.

---

## How It Works

```
User pastes error log
        ↓
Step 1 — Detect   → LLM analyzes the log, extracts endpoint + failing field
        ↓
Step 2 — Crawl    → Fetches vendor OpenAPI spec, identifies what changed
        ↓
Step 3 — Patch    → Rewrites the broken function using AST-validated code gen
        ↓
Step 4 — PR       → Opens a GitHub PR with full explanation
```

End-to-end in under 60 seconds.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS |
| Backend | FastAPI, Python 3.12, uvicorn |
| Agent / LLM | Groq API (Llama 3.3 70B), dual-key rotation |
| Database | Supabase (PostgreSQL) |
| Job Queue | Upstash Redis |
| Auth | GitHub OAuth 2.0 |
| CI/CD | GitHub Actions (lint + test on every push) |
| Hosting | Vercel (frontend), Render (backend) |

100% free-tier infrastructure.

---

## Architecture

```
Browser (Vercel)
      ↓ HTTPS
FastAPI Backend (Render)
      ↓
  ┌───────────────────────────────┐
  │        Agent Pipeline         │
  │  detect → crawl → patch → pr  │
  └───────────────────────────────┘
      ↓              ↓           ↓
  Groq API      GitHub API   Supabase
                              ↑
                        Upstash Redis
                        (job queue)
```

---

## Agent Pipeline

### Step 1 — Detect (`detect.py`)
Parses the raw error log using an LLM prompt. Returns structured JSON: endpoint, HTTP method, failing field, vendor name.

### Step 2 — Crawl (`crawl.py`)
Fetches the vendor's public OpenAPI spec (Stripe, Twilio, Shopify). Uses jsondiff to compare old vs new schema. LLM summarizes the breaking change in plain English.

### Step 3 — Patch (`patch.py`)
Fetches the broken file from the user's GitHub repo. Prompts the LLM to rewrite only the failing function. Validates output with `ast.parse()` before proceeding.

### Step 4 — PR (`pr.py`)
Creates a new branch `selfheal/fix-{timestamp}`, pushes the patched file, opens a Pull Request with a structured description explaining what broke and how it was fixed.

---

## Key Engineering Decisions

See [ARCHITECTURE-DECISIONS.md](./ARCHITECTURE-DECISIONS.md) for the full ADR log. Highlights:

- **No LangChain** — custom 4-step linear pipeline is simpler, more debuggable, and easier for reviewers to understand
- **Groq over OpenAI** — free tier with 14,400 req/day; dual-key rotation handles rate limits automatically
- **Static analysis only** — patched code is never executed server-side; `ast.parse()` validates syntax without running anything
- **`/api/v1/` prefix from day one** — zero cost to add now, expensive to retrofit later

---

## Security

See [SECURITY.md](./SECURITY.md) for the full threat model. Key points:

- GitHub tokens stored server-side only, never returned to the frontend
- Error logs validated via Pydantic before reaching the agent
- No arbitrary code execution — lint and syntax checks only
- CORS restricted to the configured frontend origin

---

## Local Development

### Prerequisites
- Python 3.12+
- Node.js 18+
- `uv` package manager
- Supabase account
- Groq API keys (free at console.groq.com)
- GitHub OAuth App

### Backend
```bash
cd backend
uv sync
cp ../.env.example .env
# Fill in your keys in .env
uv run uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
See `.env.example` for the full list of required variables.

### Run Tests
```bash
cd backend
uv run pytest tests/ -v
```

---

## Project Structure

```
selfheal-api/
├── backend/
│   ├── app/
│   │   ├── agent/          # detect.py, crawl.py, patch.py, pr.py
│   │   ├── routers/        # jobs.py, github.py
│   │   ├── db/             # Supabase client
│   │   └── queue/          # Redis worker
│   └── tests/
└── frontend/
    └── src/
        └── pages/          # Landing, Dashboard, NewJob, JobProgress, JobResult
```

---

## Roadmap

- [ ] TypeScript support (currently Python only)
- [ ] Webhook integration (auto-trigger on API gateway alerts)
- [ ] Support for more vendors (Plaid, SendGrid, Twilio)
- [ ] Self-serve data deletion

---

*Built by [Suraj](https://github.com/codewithleo1)*