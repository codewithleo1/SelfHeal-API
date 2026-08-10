# backend/app/agent/search.py
import httpx

from app.agent.llm_client import LLMClient

FUNCTION_FINDER_PROMPT = """You are a code analyst.
Given a file's source code and a failing API endpoint, identify which function is responsible for calling that endpoint.

You must respond with ONLY a valid JSON object. No explanation, no markdown, no code blocks.

Return:
{
  "function_name": "the_function_name",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence"
}

If you cannot identify a specific function, return:
{"function_name": null, "confidence": 0.0, "reasoning": "explain why"}"""


def _extract_search_keyword(endpoint: str, vendor: str) -> str:
    """
    Extract the best keyword to search for in source code.
    e.g. "https://api.stripe.com/v1/payment_intents" → "payment_intents"
    """
    # Strip the base URL and use the last meaningful path segment
    path = (endpoint or "").rstrip("/")
    segments = [s for s in path.split("/") if s and not s.startswith("http") and "." not in s]

    if segments:
        # Prefer the last non-version segment (skip "v1", "v2", etc.)
        for seg in reversed(segments):
            if not seg.startswith("v") or not seg[1:].isdigit():
                return seg

    # Fallback: use vendor name
    return vendor.lower().replace(" ", "_")


def _search_github_code(owner: str, repo: str, keyword: str, github_token: str) -> list[dict]:
    """
    Search GitHub code for a keyword in the given repo.
    Returns list of {path, url} for matching files.
    """
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    params = {
        "q": f"{keyword} repo:{owner}/{repo}",
        "per_page": 5,
    }

    with httpx.Client(timeout=15.0) as client:
        resp = client.get(
            "https://api.github.com/search/code",
            headers=headers,
            params=params,
        )

    if resp.status_code == 403:
        raise RuntimeError("GitHub search rate limit hit — wait 60 seconds and retry")
    if resp.status_code == 422:
        raise RuntimeError(f"GitHub search rejected query '{keyword}': {resp.text}")
    resp.raise_for_status()

    items = resp.json().get("items", [])
    return [{"path": item["path"], "url": item["git_url"]} for item in items]


def _fetch_file_content(owner: str, repo: str, file_path: str, github_token: str) -> str:
    """Fetch raw file content from GitHub."""
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}"

    with httpx.Client(timeout=15.0) as client:
        resp = client.get(url, headers=headers)

    resp.raise_for_status()

    # GitHub returns base64-encoded content by default
    import base64
    data = resp.json()
    if data.get("encoding") == "base64":
        return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
    return data.get("content", "")


def _find_function_in_file(file_content: str, endpoint: str, llm: LLMClient) -> dict:
    """Ask the LLM which function in the file calls the given endpoint."""
    prompt = (
        f"Failing endpoint: {endpoint}\n\n"
        f"File content:\n```\n{file_content[:6000]}\n```\n\n"
        "Which function calls this endpoint?"
    )
    response = llm.complete(
        system=FUNCTION_FINDER_PROMPT,
        user=prompt,
        max_tokens=300,
    )

    import json
    try:
        return json.loads(response.strip())
    except json.JSONDecodeError:
        return {"function_name": None, "confidence": 0.0, "reasoning": "LLM parse error"}


def search(
    repo_url: str,
    endpoint: str,
    vendor: str,
    github_token: str,
    llm: LLMClient | None = None,
    failing_field: str = "",
) -> dict:
    """
    Search a GitHub repo for the file and function that calls a failing endpoint.

    Args:
        repo_url: Full GitHub URL, e.g. https://github.com/owner/repo
        endpoint: The failing API endpoint URL from detect step
        vendor: Vendor name from detect step (used as fallback keyword)
        github_token: User's GitHub OAuth token
        llm: Optional LLMClient instance

    Returns:
        {
            "file_path": str,
            "function_name": str,
            "match_score": float,
            "search_query": str,
            "candidates_checked": int,
        }
        or {"status": "not_found", "reason": str}
    """
    if llm is None:
        llm = LLMClient()

    # Parse owner/repo from URL
    parts = repo_url.rstrip("/").replace("https://github.com/", "").split("/")
    if len(parts) < 2:
        return {"status": "not_found", "reason": f"Cannot parse repo URL: {repo_url}"}
    owner, repo = parts[0], parts[1]

    if endpoint:
        keyword = _extract_search_keyword(endpoint, vendor) or failing_field or vendor.lower()
    else:
        keyword = failing_field or vendor.lower()

    try:
        candidates = _search_github_code(owner, repo, keyword, github_token)
    except RuntimeError as e:
        return {"status": "not_found", "reason": str(e)}

    if not candidates:
        return {
            "status": "not_found",
            "reason": f"No files found containing '{keyword}' in {owner}/{repo}",
        }

    # Check up to 3 candidates, pick the one with highest LLM confidence
    best: dict = {}
    checked = 0

    for candidate in candidates[:3]:
        checked += 1
        try:
            content = _fetch_file_content(owner, repo, candidate["path"], github_token)
        except Exception as e:
            print(f"[search] Could not fetch {candidate['path']}: {e}")
            continue

        result = _find_function_in_file(content, endpoint, llm)
        confidence = result.get("confidence", 0.0)

        if not best or confidence > best.get("match_score", 0.0):
            best = {
                "file_path": candidate["path"],
                "function_name": result.get("function_name"),
                "match_score": confidence,
                "search_query": keyword,
                "candidates_checked": checked,
            }

        # Good enough — stop early
        if confidence >= 0.85:
            break

    if not best or not best.get("function_name"):
        return {
            "status": "not_found",
            "reason": "Found files but could not identify the responsible function",
            "candidates_checked": checked,
        }

    return best