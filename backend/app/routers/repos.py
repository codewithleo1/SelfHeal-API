# backend/app/routers/repos.py

import json
import re

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.agent.llm_client import LLMClient

router = APIRouter(prefix="/api/v1/repos", tags=["repos"])

SYSTEM_PROMPT = """You are an API risk analyst.
Given a list of files and dependency contents from a GitHub repo,
identify which third-party API vendors are used and assess the risk
of API schema drift.

Respond with ONLY a valid JSON object. No markdown, no explanation, no backticks.

{
  "vendors": ["stripe", "twilio"],
  "risk_level": "low|medium|high",
  "risk_reason": "one sentence explaining the risk",
  "suggested_action": "one specific action the developer should take",
  "files_scanned": ["requirements.txt", "stripe_client.py"]
}

Known vendors to detect: stripe, twilio, shopify, plaid, sendgrid,
braintree, square, razorpay, paypal, aws, firebase, supabase, pinecone.

If no known vendors found, return risk_level: "low" and suggest
monitoring for future integrations."""


class RepoAnalyzeRequest(BaseModel):
    repo_url: str
    github_token: str


def _parse_owner_repo(repo_url: str) -> tuple[str, str]:
    """Extract owner and repo name from a GitHub URL."""
    match = re.match(r"https://github\.com/([^/]+)/([^/]+?)(?:\.git)?$", repo_url)
    if not match:
        raise HTTPException(status_code=400, detail="Invalid GitHub repo URL")
    return match.group(1), match.group(2)


def _github_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _fetch_repo_root_files(owner: str, repo: str, token: str) -> list[str]:
    """Return list of filenames in the repo root."""
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/"
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(url, headers=_github_headers(token))
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Repo not found or not accessible")
    resp.raise_for_status()
    return [item["name"] for item in resp.json() if item["type"] == "file"]


def _fetch_file_content(owner: str, repo: str, filename: str, token: str) -> str | None:
    """Fetch raw content of a single file. Returns None if not found."""
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{filename}"
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(url, headers=_github_headers(token))
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    import base64
    data = resp.json()
    if data.get("encoding") == "base64":
        return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
    return data.get("content", "")


@router.post("/analyze")
async def analyze_repo(body: RepoAnalyzeRequest):
    """Analyze a GitHub repo for API vendor usage and drift risk."""
    owner, repo = _parse_owner_repo(body.repo_url)

    # Step 1 — list root files
    try:
        root_files = _fetch_repo_root_files(owner, repo, body.github_token)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"GitHub API error: {e}") from e

    # Step 2 — fetch dependency files if they exist
    dep_files = ["requirements.txt", "package.json", "Pipfile", "pyproject.toml"]
    scanned_contents: dict[str, str] = {}

    for fname in dep_files:
        if fname in root_files:
            content = _fetch_file_content(owner, repo, fname, body.github_token)
            if content:
                scanned_contents[fname] = content[:2000]  # cap at 2000 chars

    # Step 3 — build LLM prompt
    file_list_str = "\n".join(f"- {f}" for f in root_files)
    deps_str = ""
    for fname, content in scanned_contents.items():
        deps_str += f"\n\n=== {fname} ===\n{content}"

    user_prompt = f"""Repo: {body.repo_url}

Root files:
{file_list_str}

Dependency file contents:{deps_str if deps_str else chr(10) + "(none found)"}

Analyze this repo and return the JSON risk assessment."""

    # Step 4 — call LLM
    try:
        llm = LLMClient()
        raw = llm.complete(system=SYSTEM_PROMPT, user=user_prompt, max_tokens=500)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}") from e

    # Step 5 — parse JSON response
    try:
        # Strip markdown fences if model included them
        cleaned = re.sub(r"```(?:json)?|```", "", raw).strip()
        result = json.loads(cleaned)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail=f"LLM returned invalid JSON: {raw[:200]}")

    return {
        "repo_url": body.repo_url,
        "analysis": result,
    }