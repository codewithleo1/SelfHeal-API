# Security Policy
### SelfHeal-API — Autonomous API Drift & Schema Remediation Agent

---

## 1. Supported Versions

| Version | Supported |
|---|---|
| 1.x (current) | ✅ Active |

This is a portfolio-stage project under active development. Security fixes are applied to the latest version only.

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability, **do not open a public GitHub issue.**

Email: `security@selfheal-api.dev` *(replace with your actual email before publishing)*

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

You will receive an acknowledgement within **48 hours** and a resolution update within **7 days**.

---

## 3. Threat Model

These are the attack surfaces we have identified and the controls in place for each.

### 3.1 User-Supplied Input
**Risk:** Error logs and repo URLs are user-supplied. A malicious user could attempt prompt injection (embedding instructions inside the error log to manipulate Claude's output) or supply a repo URL pointing to a system they don't own.

**Controls:**
- Error log content is passed to Claude inside a clearly delimited system prompt with explicit instructions to treat it as data, not instructions
- Repo URLs are validated against a strict regex before any GitHub API call is made
- Users can only access repos they have explicitly authorized via GitHub OAuth — the GitHub API enforces this at the permission boundary
- All input is validated via Pydantic models before reaching the agent

### 3.2 Code Execution
**Risk:** The agent generates and validates code. If arbitrary code were executed server-side, this would be a critical vulnerability.

**Controls:**
- The agent **never executes** patched code — it only performs static analysis
- Python validation uses `ast.parse()` — this parses syntax only, it does not run the code
- TypeScript validation uses `tsc --noEmit` — compile check only, no execution
- Lint runs via `subprocess` with a **30-second hard timeout** and a restricted PATH
- No `eval()`, `exec()`, or shell interpolation of user-supplied content anywhere in the codebase

### 3.3 GitHub Token Handling
**Risk:** GitHub OAuth tokens grant write access to user repositories. Token leakage would be a serious incident.

**Controls:**
- Tokens are stored server-side in Supabase only — never returned to the frontend, never logged
- OAuth scope is limited to `repo` — the minimum required
- Tokens are never written to application logs
- GitHub's token format is included in secret scanning patterns (enabled on this repo)

### 3.4 API Key Exposure
**Risk:** Anthropic and Groq API keys, if leaked, could be used to run up charges on the project's account.

**Controls:**
- All API keys are stored as environment variables only
- Keys are never committed to the repository (enforced via `.gitignore` and GitHub secret scanning)
- The frontend has zero knowledge of any backend API keys — all LLM calls are proxied through the FastAPI backend
- `.env.example` contains only placeholder values, never real keys

### 3.5 Rate Limiting & Abuse
**Risk:** An unauthenticated or authenticated user could hammer the job creation endpoint, exhausting Claude API credits or Supabase write limits.

**Controls:**
- `/api/v1/jobs` requires a valid GitHub OAuth session — no anonymous job creation
- Upstash Redis rate limiter enforces **10 requests per minute per authenticated user**
- Job queue (Upstash Redis) decouples HTTP request volume from actual agent execution
- Health endpoint (`/api/health`) is unauthenticated but returns no sensitive data

---

## 4. Data Handling & PII Policy

### 4.1 What We Store
| Data | Where | Why |
|---|---|---|
| GitHub user ID | Supabase `jobs` table | Associate jobs with users |
| GitHub repo URL | Supabase `jobs` table | Agent needs to access the repo |
| Error log (raw) | Supabase `jobs` table | Required for agent Step 1 |
| Patched code diff | Supabase `jobs` table | Displayed on result page |
| Agent step outputs | Supabase `agent_steps` table | Live progress UI + audit trail |
| GitHub OAuth token | Supabase session | Repo read/write operations |

### 4.2 What We Do NOT Store
- Passwords (GitHub OAuth — no password flow)
- Payment information (no billing in current version)
- Full repository contents (only the specific file being patched is fetched)
- Claude API responses beyond the patch output and explanation

### 4.3 PII in Error Logs
Error logs submitted by users **may contain sensitive data** such as API keys, internal IP addresses, customer identifiers, or bearer tokens depending on the user's logging configuration.

**Our position:**
- We store the raw error log as submitted — we do not strip or redact it
- Users are responsible for sanitizing their logs before submission
- This is documented in the README and the job creation form UI includes a warning
- Future version (v2) will include automatic PII detection and redaction before storage

### 4.4 Data Retention
| Data | Retention Period |
|---|---|
| Job records (all statuses) | 90 days from creation |
| Agent step logs | 90 days from creation |
| GitHub OAuth tokens | Deleted on user logout or 30-day inactivity |
| Error log content | 90 days (same as job record) |

After the retention period, records are hard-deleted from Supabase via a scheduled function. No soft-delete or archive — data is gone.

### 4.5 User Data Deletion
Users can request full deletion of their data by emailing the address in Section 2. All jobs, step logs, and session data associated with their GitHub user ID will be deleted within **72 hours**.

A self-serve deletion button is planned for v2 on the Dashboard page.

---

## 5. CORS Policy

The backend accepts cross-origin requests **only from the configured frontend origin.**

```
Allowed origin:  https://selfheal-api.vercel.app (production)
                 http://localhost:5173 (local dev only)
Allowed methods: GET, POST, OPTIONS
Allowed headers: Content-Type, Authorization
```

`allow_all_origins = True` is **never used in production.** The `FRONTEND_URL` environment variable drives the allowed origin list — changing deployment URL requires updating this variable.

---

## 6. Secrets Management

| Secret | Storage | Rotation |
|---|---|---|
| `ANTHROPIC_API_KEY` | Railway env vars | On suspected leak |
| `GROQ_API_KEY` | Railway env vars | On suspected leak |
| `GITHUB_CLIENT_SECRET` | Railway env vars | On suspected leak |
| `SUPABASE_SERVICE_KEY` | Railway env vars | On suspected leak |
| `UPSTASH_REDIS_TOKEN` | Railway env vars | On suspected leak |

GitHub secret scanning is enabled on this repository. Any accidental commit of a secret pattern triggers an automated alert.

---

## 7. Dependency Security

- Python dependencies are pinned in `requirements.txt` with exact versions
- `uv` is used as the package manager — it generates a lockfile (`uv.lock`) that is committed to the repo
- Dependabot is enabled on this repository for automated dependency update PRs
- No dependency with a known critical CVE is knowingly included

---

*Last updated: July 2026 | Review this document when any new data type is stored or any new external service is integrated.*
