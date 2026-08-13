# backend/app/routers/webhooks.py
import hashlib
import hmac
import json
import os
import threading
import uuid
from datetime import UTC, datetime

from dotenv import load_dotenv
from fastapi import APIRouter, Header, HTTPException, Query, Request

from app.agent.orchestrator import run_agent
from app.db.client import get_db

load_dotenv()

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])

SENTRY_WEBHOOK_SECRET = os.getenv("SENTRY_WEBHOOK_SECRET", "")
AGENT_GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")


def _verify_sentry_signature(body: bytes, sentry_hook_signature: str) -> bool:
    """
    Verify Sentry webhook HMAC signature.
    Sentry sends: sentry-hook-signature: sha256=<hex>
    """
    if not SENTRY_WEBHOOK_SECRET:
        # No secret configured — skip verification in dev
        return True

    expected = hmac.new(
        SENTRY_WEBHOOK_SECRET.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()

    received = sentry_hook_signature.replace("sha256=", "")
    return hmac.compare_digest(expected, received)


def _extract_error_log(payload: dict) -> str:
    """
    Extract a readable error log string from Sentry webhook payload.
    Works for both issue-created and issue-assigned actions.
    """
    data = payload.get("data", {})
    issue = data.get("issue", data.get("error", {}))

    title = issue.get("title", "Unknown error")
    culprit = issue.get("culprit", "unknown location")
    level = issue.get("level", "error")
    web_url = issue.get("web_url", "")
    metadata = issue.get("metadata", {})
    value = metadata.get("value", "")

    lines = [
        f"Error: {title}",
        f"Level: {level}",
        f"Location: {culprit}",
    ]
    if value:
        lines.append(f"Detail: {value}")
    if web_url:
        lines.append(f"Sentry URL: {web_url}")

    return "\n".join(lines)


def _run_in_background(job_id: str, error_log: str, repo_url: str) -> None:
    """Fire the agent pipeline in a background thread."""
    try:
        run_agent(
            job_id=job_id,
            error_log=error_log,
            repo_url=repo_url,
            github_token=AGENT_GITHUB_TOKEN,
        )
    except Exception as e:
        print(f"[webhook] Background agent failed for job {job_id}: {e}")


@router.post("/sentry")
async def sentry_webhook(
    request: Request,
    repo: str = Query(..., description="GitHub repo URL to heal"),
    sentry_hook_signature: str = Header(default=""),
):
    """
    Receive Sentry error webhook and trigger autonomous healing.

    Configure in Sentry:
      URL: https://selfheal-api.onrender.com/api/v1/webhooks/sentry?repo=https://github.com/your-org/your-repo
      Events: issue created
    """
    body = await request.body()

    # Verify signature
    if sentry_hook_signature and not _verify_sentry_signature(body, sentry_hook_signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    # Parse payload
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Only act on issue-created events
    action = payload.get("action", "")
    if action not in ("created", "triggered"):
        return {"status": "ignored", "reason": f"action '{action}' not handled"}

    # Validate repo URL
    if not repo.startswith("https://github.com/"):
        raise HTTPException(status_code=400, detail="repo must be a GitHub URL")

    if not AGENT_GITHUB_TOKEN:
        raise HTTPException(status_code=500, detail="AGENT_GITHUB_TOKEN not configured")

    # Extract error log from Sentry payload
    error_log = _extract_error_log(payload)

    # Derive user_id from repo owner (e.g. https://github.com/codewithleo1/repo → codewithleo1)
    try:
        repo_owner = repo.replace("https://github.com/", "").split("/")[0]
    except Exception:
        repo_owner = "sentry-webhook"

    # Create job in Supabase
    job_id = str(uuid.uuid4())
    db = get_db()
    db.table("jobs").insert({
        "id": job_id,
        "user_id": repo_owner,
        "repo_url": repo,
        "error_log": error_log,
        "status": "queued",
        "created_at": datetime.now(UTC).isoformat(),
    }).execute()

    # Fire agent in background — return 200 immediately so Sentry doesn't retry
    thread = threading.Thread(
        target=_run_in_background,
        args=(job_id, error_log, repo),
        daemon=True,
    )
    thread.start()

    return {
        "status": "accepted",
        "job_id": job_id,
        "message": "Agent triggered. Track progress at /api/v1/jobs/{job_id}",
    }