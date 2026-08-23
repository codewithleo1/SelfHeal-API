# backend/app/agent/search.py
import base64
import json
import re

import httpx

from app.agent.llm_client import LLMClient

FUNCTION_FINDER_PROMPT = """You are a code analyst.
Given a file's source code and a failing API endpoint or field, identify which function is responsible.

You must respond with ONLY a valid JSON object. No explanation, no markdown, no code blocks.

Return:
{
  "function_name": "the_function_name",
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence"
}

If you cannot identify a specific function, return:
{"function_name": null, "confidence": 0.0, "reasoning": "explain why"}"""


def clean_json(raw: str) -> str:
    """Robustly clean LLM output to extract valid JSON."""
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                raw = part
                break
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start != -1 and end > start:
        raw = raw[start:end]
    raw = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', raw)
    raw = re.sub(r',\s*([}\]])', r'\1', raw)
    return raw


def _extract_search_keyword(endpoint: str, vendor: str) -> str:
    path = (endpoint or "").rstrip("/")
    segments = [s for s in path.split("/") if s and not s.startswith("http") and "." not in s]
    if segments:
        for seg in reversed(segments):
            if not seg.startswith("v") or not seg[1:].isdigit():
                return seg
    return vendor.lower().replace(" ", "_")


def _search_github_code(owner: str, repo: str, keyword: str, github_token: str) -> list[dict]:
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    params = {"q": f"{keyword} repo:{owner}/{repo}", "per_page": 5}
    with httpx.Client(timeout=15.0) as client:
        resp = client.get("https://api.github.com/search/code", headers=headers, params=params)
    if resp.status_code == 403:
        raise RuntimeError("GitHub search rate limit hit — wait 60 seconds and retry")
    if resp.status_code == 422:
        raise RuntimeError(f"GitHub search rejected query '{keyword}': {resp.text}")
    resp.raise_for_status()
    items = resp.json().get("items", [])
    return [{"path": item["path"], "url": item["git_url"]} for item in items]


def _fetch_file_content(owner: str, repo: str, file_path: str, github_token: str) -> str:
    headers = {
        "Authorization": f"Bearer {github_token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}"
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(url, headers=headers)
    resp.raise_for_status()
    content_type = resp.headers.get("content-type", "")
    if "application/json" not in content_type:
        return resp.text
    data = resp.json()
    if data.get("encoding") == "base64":
        return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
    return data.get("content", "")


def _find_function_in_file(file_content: str, hint: str, llm: LLMClient) -> dict:
    prompt = (
        f"Failing endpoint or field: {hint}\n\n"
        f"File content:\n```\n{file_content[:6000]}\n```\n\n"
        "Which function calls this endpoint or uses this field?"
    )
    response = llm.complete(system=FUNCTION_FINDER_PROMPT, user=prompt, max_tokens=300)
    try:
        cleaned = clean_json(response)
        return json.loads(cleaned)
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

    Returns:
        dict with file_path, function_name, match_score
        or {"status": "not_found", "reason": str}
    """
    if llm is None:
        llm = LLMClient()

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
        candidates = []
        print(f"[search] GitHub search failed: {e}")

    if not candidates:
        print(f"[search] No search results for '{keyword}', scanning repo files directly")
        try:
            headers = {
                "Authorization": f"Bearer {github_token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            }
            with httpx.Client(timeout=15.0) as client:
                resp = client.get(
                    f"https://api.github.com/repos/{owner}/{repo}/contents",
                    headers=headers,
                )
            resp.raise_for_status()
            all_files = [f["path"] for f in resp.json() if f["type"] == "file" and f["path"].endswith(".py")]
            print(f"[search] Found {len(all_files)} Python files: {all_files}")
            candidates = [{"path": f, "url": ""} for f in all_files]
        except Exception as e:
            print(f"[search] Failed to list repo contents: {e}")
            return {"status": "not_found", "reason": f"Could not list repo files: {e}"}

    if not candidates:
        return {"status": "not_found", "reason": f"No Python files found in {owner}/{repo}"}

    best: dict = {}
    checked = 0
    hint = failing_field or endpoint or keyword

    for candidate in candidates[:5]:
        checked += 1
        try:
            content = _fetch_file_content(owner, repo, candidate["path"], github_token)
        except Exception as e:
            print(f"[search] Could not fetch {candidate['path']}: {e}")
            continue

        if failing_field and failing_field not in content:
            print(f"[search] Skipping {candidate['path']} — does not contain '{failing_field}'")
            continue

        result = _find_function_in_file(content, hint, llm)
        confidence = result.get("confidence", 0.0)
        print(f"[search] {candidate['path']} -> {result.get('function_name')} ({confidence})")

        if not best or confidence > best.get("match_score", 0.0):
            best = {
                "file_path": candidate["path"],
                "function_name": result.get("function_name"),
                "match_score": confidence,
                "search_query": keyword,
                "candidates_checked": checked,
            }

        if confidence >= 0.85:
            break

    if not best or not best.get("function_name"):
        return {
            "status": "not_found",
            "reason": "Found files but could not identify the responsible function",
            "candidates_checked": checked,
        }

    return best