# backend/app/routers/jobs.py

import os
import re

import httpx
import uuid

from dotenv import load_dotenv
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.db.client import get_db
from app.queue.worker import enqueue

load_dotenv()

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


class JobCreate(BaseModel):
    repo_url: str
    error_log: str


@router.post("")
async def create_job(
    body: JobCreate,
    authorization: str = Header(...),
):
    """Create a new remediation job and enqueue it."""
    try:
        token_part = authorization.replace("Bearer ", "")
        github_token, github_user = token_part.split(":")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    if not body.repo_url.startswith("https://github.com/"):
        raise HTTPException(status_code=400, detail="repo_url must be a GitHub URL")

    job_id = str(uuid.uuid4())
    db = get_db()
    db.table("jobs").insert({
        "id": job_id,
        "user_id": github_user,
        "repo_url": body.repo_url,
        "error_log": body.error_log,
        "status": "queued",
    }).execute()

    enqueue({
        "job_id": job_id,
        "error_log": body.error_log,
        "repo_url": body.repo_url,
        "github_token": github_token,
    })

    return {"job_id": job_id, "status": "queued"}


@router.get("/{job_id}")
async def get_job(job_id: str):
    """Get job status and agent step progress."""
    db = get_db()

    job = db.table("jobs").select("*").eq("id", job_id).single().execute()
    if not job.data:
        raise HTTPException(status_code=404, detail="Job not found")

    steps = db.table("agent_steps").select("*").eq("job_id", job_id).order("step").execute()

    return {
        "job": job.data,
        "steps": steps.data,
    }


@router.get("")
async def list_jobs(authorization: str = Header(...)):
    """List all jobs for the authenticated user."""
    try:
        token_part = authorization.replace("Bearer ", "")
        _, github_user = token_part.split(":")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    db = get_db()
    jobs = db.table("jobs").select("*").eq("user_id", github_user).order("created_at", desc=True).execute()

    return {"jobs": jobs.data}

def _get_pr_status(pr_url: str, github_token: str) -> str:
    """Check GitHub PR status. Returns: 'open', 'merged', or 'closed'"""
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


@router.get("/{job_id}/sync-pr")
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
    return {"job_id": job_id, "pr_url": pr_url, "pr_status": pr_status}