# backend/app/routers/demo.py
# Public endpoint — no auth required.
# Resets the broken file on selfheal-test-repo, then enqueues a real job.
# Rate-limited: 1 run per IP per 10 minutes via Upstash Redis.

import asyncio
import base64
import os
import uuid
from datetime import UTC, datetime

import httpx
from fastapi import APIRouter, HTTPException, Request

from app.db.client import get_db
from app.queue.worker import enqueue

router = APIRouter()

# ── constants ────────────────────────────────────────────────────────────────
AGENT_TOKEN   = os.getenv("GITHUB_TOKEN") or os.getenv("AGENT_GITHUB_TOKEN", "")
TEST_REPO     = "codewithleo1/selfheal-test-repo"
BROKEN_FILE   = "stripe_client.py"
DEMO_USER_ID  = "demo-visitor"
RATE_LIMIT_TTL = 600  # 10 minutes in seconds

# The canonical broken file content — always reset to this before each demo.
# This is the file that contains the old "amount" field the agent will fix.
BROKEN_FILE_CONTENT = '''\
import httpx


def create_payment_intent(amount: int, currency: str) -> dict:
    """Create a payment intent using Stripe API."""
    response = httpx.post(
        "https://api.stripe.com/v1/payment_intents",
        headers={"Authorization": "Bearer sk_test_placeholder"},
        json={
            "amount": amount * 100,
            "currency": currency,
            "payment_method_types": ["card"],
        },
    )
    return response.json()
'''

DEMO_ERROR_LOG = """\
POST /v1/payment_intents 400 Bad Request
{
  "error": {
    "type": "invalid_request_error",
    "code": "parameter_unknown",
    "message": "Unknown field: amount. Did you mean amount_total?",
    "param": "amount"
  }
}
"""


# ── rate limiter (Upstash Redis via HTTP) ───────────────────────────────────
async def check_rate_limit(ip: str) -> bool:
    """
    Returns True if the request is allowed, False if rate-limited.
    Uses Upstash Redis SET NX EX pattern — no brpop, HTTP only.
    """
    redis_url   = os.getenv("UPSTASH_REDIS_URL", "")
    redis_token = os.getenv("UPSTASH_REDIS_TOKEN", "")
    if not redis_url or not redis_token:
        return True  # no Redis configured — allow through

    key = f"demo_ratelimit:{ip}"
    headers = {"Authorization": f"Bearer {redis_token}"}
    # SET key 1 NX EX 600  → only sets if key doesn't exist
    cmd_url = f"{redis_url}/set/{key}/1/nx/ex/{RATE_LIMIT_TTL}"
    async with httpx.AsyncClient() as client:
        res = await client.get(cmd_url, headers=headers)
        data = res.json()
        # Upstash returns {"result": "OK"} on set, {"result": null} if key exists
        return data.get("result") == "OK"


# ── reset the broken file on GitHub ─────────────────────────────────────────
async def reset_broken_file() -> None:
    """
    Pushes BROKEN_FILE_CONTENT back to main on selfheal-test-repo.
    This ensures every demo run starts from the same broken state.
    """
    if not AGENT_TOKEN:
        raise HTTPException(status_code=500, detail="Agent token not configured")

    headers = {
        "Authorization": f"Bearer {AGENT_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    file_url = f"https://api.github.com/repos/{TEST_REPO}/contents/{BROKEN_FILE}"

    async with httpx.AsyncClient() as client:
        # 1. Get current SHA of the file (required for update)
        get_res = await client.get(file_url, headers=headers)
        if get_res.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch test repo file")
        current_sha = get_res.json()["sha"]

        # 2. Push the broken content back
        encoded = base64.b64encode(BROKEN_FILE_CONTENT.encode()).decode()
        put_res = await client.put(
            file_url,
            headers=headers,
            json={
                "message": "chore: reset broken file for demo run",
                "content": encoded,
                "sha": current_sha,
                "branch": "main",
            },
        )
        if put_res.status_code not in (200, 201):
            raise HTTPException(
                status_code=502,
                detail=f"Failed to reset test file: {put_res.text[:200]}",
            )


# ── create job row in Supabase ───────────────────────────────────────────────
async def create_demo_job(job_id: str) -> None:
    db = get_db()
    db.table("jobs").insert({
        "id": job_id,
        "user_id": DEMO_USER_ID,
        "repo_url": f"https://github.com/{TEST_REPO}",
        "error_log": DEMO_ERROR_LOG,
        "status": "queued",
        "created_at": datetime.now(UTC).isoformat(),
        "updated_at": datetime.now(UTC).isoformat(),
    }).execute()


# ── main endpoint ────────────────────────────────────────────────────────────
@router.post("/demo/run")
async def run_demo(request: Request):
    """
    Public endpoint. No auth required.
    1. Rate-limit by IP (1 run / 10 min)
    2. Reset broken file on selfheal-test-repo
    3. Create a real job row in Supabase
    4. Enqueue to Redis worker
    5. Return job_id — frontend polls /api/v1/jobs/{job_id} for live progress
    """
    # 1. Rate limit
    ip = request.client.host if request.client else "unknown"
    allowed = await check_rate_limit(ip)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Demo is rate-limited to once per 10 minutes. Try again shortly.",
        )

    # 2. Reset the broken file
    await reset_broken_file()

    # Small pause so GitHub's CDN propagates the reset before the agent reads it
    await asyncio.sleep(1)

    # 3. Create job in Supabase
    job_id = str(uuid.uuid4())
    await create_demo_job(job_id)

    # 4. Enqueue to Redis worker (same queue the real jobs use)
    enqueue({
        "job_id": job_id,
        "error_log": DEMO_ERROR_LOG,
        "repo_url": f"https://github.com/{TEST_REPO}",
        "github_token": AGENT_TOKEN,
    })

    # 5. Return
    return {
        "job_id": job_id,
        "message": "Demo job started. Poll /api/v1/jobs/{job_id} for live progress.",
        "repo_url": f"https://github.com/{TEST_REPO}",
        "is_demo": True,
    }


@router.get("/demo/status")
async def demo_status():
    """Health check — confirms demo endpoint is reachable."""
    return {"status": "ok", "test_repo": TEST_REPO}