import base64
from datetime import datetime

import httpx

GITHUB_API = "https://api.github.com"


def _get_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def _get_default_branch(repo: str, token: str) -> str:
    """Get the default branch name (main or master)."""
    response = httpx.get(
        f"{GITHUB_API}/repos/{repo}",
        headers=_get_headers(token),
        timeout=15,
    )
    response.raise_for_status()
    return response.json()["default_branch"]


def _get_branch_sha(repo: str, branch: str, token: str) -> str:
    """Get the latest commit SHA of a branch."""
    response = httpx.get(
        f"{GITHUB_API}/repos/{repo}/git/ref/heads/{branch}",
        headers=_get_headers(token),
        timeout=15,
    )
    response.raise_for_status()
    return response.json()["object"]["sha"]


def _create_branch(repo: str, branch_name: str, sha: str, token: str) -> None:
    """Create a new branch from a commit SHA."""
    response = httpx.post(
        f"{GITHUB_API}/repos/{repo}/git/refs",
        headers=_get_headers(token),
        json={"ref": f"refs/heads/{branch_name}", "sha": sha},
        timeout=15,
    )
    response.raise_for_status()


def _push_file(
    repo: str,
    branch: str,
    file_path: str,
    content: str,
    commit_message: str,
    token: str,
) -> None:
    """Push updated file content to a branch."""
    # Get current file SHA (needed for updates)
    file_response = httpx.get(
        f"{GITHUB_API}/repos/{repo}/contents/{file_path}",
        headers=_get_headers(token),
        params={"ref": branch},
        timeout=15,
    )
    file_sha = file_response.json().get("sha") if file_response.status_code == 200 else None

    encoded = base64.b64encode(content.encode()).decode()

    payload = {
        "message": commit_message,
        "content": encoded,
        "branch": branch,
    }
    if file_sha:
        payload["sha"] = file_sha

    response = httpx.put(
        f"{GITHUB_API}/repos/{repo}/contents/{file_path}",
        headers=_get_headers(token),
        json=payload,
        timeout=15,
    )
    response.raise_for_status()


def _create_pr(
    repo: str,
    branch_name: str,
    base_branch: str,
    endpoint: str,
    diff_summary: str,
    migration_notes: str,
    token: str,
) -> str:
    """Open a Pull Request and return its URL."""
    pr_body = f"""## SelfHeal-API — Automated Fix

### What broke
`{endpoint}` was returning errors due to API schema drift.

### What changed in the API
{diff_summary}

### What was fixed
{migration_notes}

### How to review
1. Check the diff below
2. Run your test suite
3. Merge if tests pass

---
*This PR was opened automatically by [SelfHeal-API](https://selfheal-api.vercel.app)*
"""

    response = httpx.post(
        f"{GITHUB_API}/repos/{repo}/pulls",
        headers=_get_headers(token),
        json={
            "title": f"[SelfHeal] Fix {endpoint} payload drift",
            "body": pr_body,
            "head": branch_name,
            "base": base_branch,
        },
        timeout=15,
    )
    response.raise_for_status()
    return response.json()["html_url"]


def create_pr(
    repo_url: str,
    file_path: str,
    patched_file: str,
    endpoint: str,
    diff_summary: str,
    migration_notes: str,
    github_token: str,
) -> dict:
    """
    Create a branch, push patched file, open a PR.

    Returns:
        dict with keys: pr_url, branch_name, status
    """
    repo = repo_url.replace("https://github.com/", "").rstrip("/")
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    branch_name = f"selfheal/fix-{timestamp}"

    try:
        base_branch = _get_default_branch(repo, github_token)
        sha = _get_branch_sha(repo, base_branch, github_token)
        _create_branch(repo, branch_name, sha, github_token)
        _push_file(
            repo=repo,
            branch=branch_name,
            file_path=file_path,
            content=patched_file,
            commit_message=f"fix: patch {file_path} for {endpoint} schema drift",
            token=github_token,
        )
        pr_url = _create_pr(
            repo=repo,
            branch_name=branch_name,
            base_branch=base_branch,
            endpoint=endpoint,
            diff_summary=diff_summary,
            migration_notes=migration_notes,
            token=github_token,
        )

        return {
            "status": "completed",
            "pr_url": pr_url,
            "branch_name": branch_name,
        }

    except Exception as e:
        return {
            "status": "error",
            "reason": str(e),
            "branch_name": branch_name,
        }