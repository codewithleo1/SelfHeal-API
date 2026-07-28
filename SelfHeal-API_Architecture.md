# SelfHeal-API — Architecture Document
### Autonomous API Drift & Schema Remediation Agent
**Version:** 1.0 | **Author:** Suraj | **Type:** SaaS Portfolio Project

---

## 1. Project Overview

SelfHeal-API is an autonomous AI agent that monitors API gateway error logs, detects payload schema drift, crawls updated vendor documentation, patches the broken client code, and opens a GitHub Pull Request — all without human intervention.

**Target Audience:** Companies using third-party APIs that frequently release breaking changes (Stripe, Twilio, Shopify, etc.)

**Live Demo URL:** `https://selfheal-api.vercel.app` *(deployed in Week 4)*

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│              React + Vite  →  selfheal-api.vercel.app           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS REST
┌──────────────────────────▼──────────────────────────────────────┐
│                    FASTAPI BACKEND                               │
│               Python 3.11  →  Railway / Render                  │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  /api/job   │  │  /api/status │  │  /api/github/oauth   │   │
│  └──────┬──────┘  └──────────────┘  └──────────────────────┘   │
│         │                                                        │
│  ┌──────▼──────────────────────────────────────────────────┐   │
│  │               AGENT ORCHESTRATOR                         │   │
│  │  Step 1: Detect  →  Step 2: Crawl  →  Step 3: Patch     │   │
│  │                                   →  Step 4: PR Create   │   │
│  └──────┬──────────────────┬──────────────────┬────────────┘   │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
   ┌──────▼──────┐   ┌───────▼──────┐   ┌──────▼──────┐
   │ Claude API  │   │  GitHub API  │   │  Supabase   │
   │ (Anthropic) │   │  (OAuth +    │   │  (Jobs DB + │
   │             │   │   REST API)  │   │   Logs)     │
   └─────────────┘   └──────────────┘   └─────────────┘
                             │
                      ┌──────▼──────┐
                      │ Upstash     │
                      │ Redis Queue │
                      └─────────────┘
```

---

## 3. Tech Stack (100% Free Tier)

### Frontend
| Tool | Purpose | Free Tier |
|---|---|---|
| React 18 + Vite | UI framework | ✅ Open source |
| TailwindCSS | Styling | ✅ Open source |
| Vercel | Hosting + CI/CD | ✅ Free (custom domain) |
| React Query | Async state / polling | ✅ Open source |

### Backend
| Tool | Purpose | Free Tier |
|---|---|---|
| Python 3.11 | Runtime | ✅ Open source |
| FastAPI | REST API framework | ✅ Open source |
| Railway or Render | Backend hosting | ✅ Free tier (500hrs/mo) |
| Uvicorn | ASGI server | ✅ Open source |
| httpx | Async HTTP client | ✅ Open source |
| jsondiff | Schema diffing | ✅ Open source |

### Agent & AI
| Tool | Purpose | Free Tier |
|---|---|---|
| Claude API (claude-sonnet-4-6) | Primary LLM — agent reasoning + code gen | ✅ Free credit on signup |
| Groq API (Llama 3.1 70B) | Fallback LLM — auto-switches on Claude rate limit | ✅ Free forever (14,400 req/day) |
| LangChain (optional) | Agent loop structure | ✅ Open source |

### Infrastructure
| Tool | Purpose | Free Tier |
|---|---|---|
| Supabase | PostgreSQL DB + Auth | ✅ Free (500MB) |
| Upstash Redis | Job queue | ✅ Free (10K cmds/day) |
| GitHub API | Repo read/write + PRs | ✅ Free |
| GitHub OAuth | User authentication | ✅ Free |

---

## 4. Agent Pipeline — Detailed Flow

### Step 1 — Intercept & Detect
```
Input:  Raw error log (4xx/5xx) pasted by user OR webhook from API gateway
        GitHub repo URL

Process:
  - Claude analyzes the error log
  - Identifies: endpoint URL, HTTP method, failing field, error message
  - Extracts the name of the mapper/client function from the repo

Output: { endpoint, method, failing_field, repo_file_path, function_name }
```

### Step 2 — Documentation Crawling
```
Input:  endpoint URL, vendor name (inferred by Claude)

Process:
  - Fetch OpenAPI/Swagger spec from known public URLs
    e.g. https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json
  - jsondiff compares old schema (from repo type defs) vs new schema
  - Claude summarizes what changed: renamed field, new required param, type change

Output: { old_schema, new_schema, diff_summary, migration_notes }
```

### Step 3 — Code Patching
```
Input:  repo_file_path, function_name, diff_summary, migration_notes

Process:
  - GitHub API fetches the raw file content
  - Claude receives: original code + schema diff + migration notes
  - Claude rewrites ONLY the failing mapper function
  - Output is validated: must be syntactically valid (ast.parse for Python,
    tsc --noEmit for TypeScript)

Output: { patched_code, patch_explanation, confidence_score }
```

### Step 4 — Verification & PR Creation
```
Input:  patched_code, original file path, repo info

Process:
  - GitHub API creates a new branch: selfheal/fix-{endpoint}-{timestamp}
  - Pushes patched file to branch
  - Runs basic lint check (ruff for Python, eslint for TS) via subprocess
  - If lint passes → opens GitHub PR with:
      Title: [SelfHeal] Fix {endpoint} payload drift
      Body:  Full diff explanation, old vs new schema, Claude's reasoning
  - Stores job result in Supabase

Output: GitHub PR URL, job_id, status: "completed"
```

---

## 5. Database Schema (Supabase / PostgreSQL)

```sql
-- Jobs table
CREATE TABLE jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,               -- GitHub user ID
  repo_url    TEXT NOT NULL,
  error_log   TEXT NOT NULL,
  status      TEXT DEFAULT 'queued',       -- queued | running | completed | failed
  pr_url      TEXT,
  patch_diff  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Agent steps log (for live UI progress)
CREATE TABLE agent_steps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID REFERENCES jobs(id),
  step        INT NOT NULL,                -- 1,2,3,4
  step_name   TEXT NOT NULL,
  status      TEXT DEFAULT 'pending',      -- pending | running | done | error
  output      JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. API Endpoints

```
POST   /api/jobs                  → Create a new remediation job
GET    /api/jobs/{job_id}         → Poll job status + step progress
GET    /api/jobs                  → List all jobs for authenticated user
POST   /api/github/oauth          → GitHub OAuth callback
GET    /api/health                → Health check
```

---

## 7. Frontend Pages

```
/                    → Landing page (hero, demo CTA, how it works)
/dashboard           → User's job history (requires GitHub login)
/jobs/new            → Paste error log + GitHub repo URL form
/jobs/{id}           → Live job progress page (polls every 2s)
/jobs/{id}/result    → Final result: PR link, patch diff, explanation
```

---

## 8. Security & Industry Standards

| Concern | Implementation |
|---|---|
| Auth | GitHub OAuth 2.0 — no passwords stored |
| Secrets | Environment variables only — never in code |
| API Keys | Server-side only — Claude API key never exposed to client |
| Input validation | Pydantic models on all FastAPI routes |
| Rate limiting | Upstash Redis rate limiter (10 req/min per user) |
| Audit trail | Every agent step logged to Supabase with timestamps |
| Repo access | User grants minimal OAuth scope: `repo` only |
| Code execution | No arbitrary code execution — lint via subprocess with timeout |

---

## 9. Folder Structure

```
selfheal-api/
├── frontend/
│   ├── src/
│   │   ├── pages/          # Landing, Dashboard, Job, Result
│   │   ├── components/     # StepProgress, DiffViewer, PRCard
│   │   ├── hooks/          # useJob, useJobPoller
│   │   └── lib/            # api.ts (axios client)
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── app/
│   │   ├── main.py         # FastAPI app entry
│   │   ├── routers/        # jobs.py, github.py, health.py
│   │   ├── agent/
│   │   │   ├── llm_client.py   # Provider-agnostic LLM with Claude→Groq fallback
│   │   │   ├── detect.py   # Step 1 — log analysis
│   │   │   ├── crawl.py    # Step 2 — OpenAPI fetcher + differ
│   │   │   ├── patch.py    # Step 3 — code patcher
│   │   │   └── pr.py       # Step 4 — GitHub PR creator
│   │   ├── models/         # Pydantic schemas
│   │   ├── db/             # Supabase client
│   │   └── queue/          # Upstash Redis worker
│   ├── requirements.txt
│   └── Dockerfile
│
├── .env.example
├── README.md
└── docker-compose.yml      # Local dev only
```

---

## 10. Environment Variables

```bash
# Backend (.env)
ANTHROPIC_API_KEY=
GROQ_API_KEY=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
FRONTEND_URL=https://selfheal-api.vercel.app

# Frontend (.env)
VITE_API_URL=https://selfheal-api.up.railway.app
VITE_GITHUB_CLIENT_ID=
```

---

## 11. Deployment

```
Frontend  →  GitHub repo → Vercel (auto-deploy on push to main)
Backend   →  GitHub repo → Railway (Dockerfile deploy, auto-deploy on push)
DB        →  Supabase dashboard (run migrations manually)
Queue     →  Upstash dashboard (no deploy needed)
```

---
Section 12 — Observability Stack
Section 13 — CI/CD Pipeline  
Section 14 — Security & Compliance

---

*Document version 1.0 — Updated as project progresses*
