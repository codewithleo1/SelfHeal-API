import os
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
    file_path: str
    function_name: str


@router.post("")
async def create_job(
    body: JobCreate,
    authorization: str = Header(...),
):
    """Create a new remediation job and enqueue it."""
    # Extract token and user from Authorization header
    # Format: "Bearer <github_token>:<github_user>"
    try:
        token_part = authorization.replace("Bearer ", "")
        github_token, github_user = token_part.split(":")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization format")

    # Validate repo URL
    if not body.repo_url.startswith("https://github.com/"):
        raise HTTPException(status_code=400, detail="repo_url must be a GitHub URL")

    # Create job in Supabase
    job_id = str(uuid.uuid4())
    db = get_db()
    db.table("jobs").insert({
        "id": job_id,
        "user_id": github_user,
        "repo_url": body.repo_url,
        "error_log": body.error_log,
        "status": "queued",
    }).execute()

    # Enqueue for background processing
    enqueue({
        "job_id": job_id,
        "error_log": body.error_log,
        "repo_url": body.repo_url,
        "file_path": body.file_path,
        "function_name": body.function_name,
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