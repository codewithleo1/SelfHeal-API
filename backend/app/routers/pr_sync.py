# backend/app/routers/pr_sync.py
import os
import re

import httpx
from fastapi import APIRouter, HTTPException

from app.db.client import get_db

router = APIRouter(prefix="/api/v1/sync-pr", tags=["jobs"])


def _get_pr_status(pr_url: str, github_token: str) -> str:
    """
    Check GitHub PR status.
    Returns: 'open', 'merged', or 'closed'
    """
    match = re.match(r"https://github\.com/([^/]+)/([^/]+)/pull/(\d+)", pr_url)
    if not match:
        return "unknown"

    owner, repo, pr_number = match.groups()

    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    with httpx.Client(timeout=10.0) as client:
        resp = client.get(
            f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}",
            headers=headers,
        )

    if resp.status_code == 404:
        return "unknown"
    resp.raise_for_status()

    data = resp.json()
    if data.get("merged"):
        return "merged"
    if data.get("state") == "closed":
        return "closed"
    return "open"


@router.get("/{job_id}")
async def sync_pr_status(job_id: str):
    """Check GitHub and update PR status for a completed job."""
    db = get_db()

    # Use maybe_single() — returns None instead of raising when row not found
    result = db.table("jobs").select("*").eq("id", job_id).maybe_single().execute()
    if not result or not result.data:
        raise HTTPException(status_code=404, detail="Job not found")

    job = result.data
    pr_url = job.get("pr_url")
    if not pr_url:
        return {"pr_status": "no_pr", "message": "Job has no PR URL"}

    github_token = os.getenv("GITHUB_TOKEN") or os.getenv("AGENT_GITHUB_TOKEN", "")
    if not github_token:
        raise HTTPException(status_code=500, detail="GITHUB_TOKEN not configured")

    pr_status = _get_pr_status(pr_url, github_token)

    # Wrap DB update — if pr_status column missing, log and continue
    try:
        db.table("jobs").update({"pr_status": pr_status}).eq("id", job_id).execute()
    except Exception as e:
        print(f"[sync-pr] Failed to update pr_status column: {e}")
        return {
            "job_id": job_id,
            "pr_url": pr_url,
            "pr_status": pr_status,
            "warning": "pr_status column missing — run migration",
        }

    return {
        "job_id": job_id,
        "pr_url": pr_url,
        "pr_status": pr_status,
    }