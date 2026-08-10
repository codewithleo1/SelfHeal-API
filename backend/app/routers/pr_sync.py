# backend/app/routers/pr_sync.py
import os
import re

import httpx
from fastapi import APIRouter, HTTPException

from app.db.client import get_db

router = APIRouter(prefix="/api/v1", tags=["jobs"])


def _get_pr_status(pr_url: str, github_token: str) -> str:
    """
    Check GitHub PR status.
    Returns: 'open', 'merged', or 'closed'
    """
    # Extract owner, repo, pr_number from URL
    # e.g. https://github.com/codewithleo1/selfheal-test-repo/pull/17
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


@router.get("/jobs/{job_id}/sync-pr")
async def sync_pr_status(job_id: str):
    """Check GitHub and update PR status for a completed job."""
    db = get_db()

    job = db.table("jobs").select("*").eq("id", job_id).single().execute()
    if not job.data:
        raise HTTPException(status_code=404, detail="Job not found")

    pr_url = job.data.get("pr_url")
    if not pr_url:
        return {"pr_status": "no_pr", "message": "Job has no PR URL"}

    github_token = os.getenv("GITHUB_TOKEN", "")
    if not github_token:
        raise HTTPException(status_code=500, detail="GITHUB_TOKEN not configured")

    pr_status = _get_pr_status(pr_url, github_token)

    db.table("jobs").update({"pr_status": pr_status}).eq("id", job_id).execute()

    return {
        "job_id": job_id,
        "pr_url": pr_url,
        "pr_status": pr_status,
    }