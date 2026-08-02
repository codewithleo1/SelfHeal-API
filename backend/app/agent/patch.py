import ast

import httpx

from app.agent.llm_client import LLMClient

SYSTEM_PROMPT = """You are an expert software engineer specializing in API integrations.
You will be given a broken code function and information about what changed in the API.
Your job is to rewrite ONLY the broken function to fix the API schema drift.

Rules:
- Return ONLY the rewritten function code. No explanation, no markdown, no code blocks.
- Do not change anything outside the function.
- Keep the same function name and signature.
- Fix only what is necessary to address the API change.
- The output must be syntactically valid Python or TypeScript."""


def _fetch_github_file(repo_url: str, file_path: str, token: str) -> str:
    """Fetch raw file content from a GitHub repository."""
    # Convert github.com URL to api.github.com
    # e.g. https://github.com/user/repo -> user/repo
    repo = repo_url.replace("https://github.com/", "").rstrip("/")

    api_url = f"https://api.github.com/repos/{repo}/contents/{file_path}"

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github.raw+json",
    }

    response = httpx.get(api_url, headers=headers, timeout=15)
    response.raise_for_status()
    return response.text


def _validate_python(code: str) -> bool:
    """Check if code is syntactically valid Python."""
    try:
        ast.parse(code)
        return True
    except SyntaxError:
        return False


def _replace_function(original_file: str, function_name: str, new_function: str) -> str:
    """Replace a specific function in a file with the patched version."""
    lines = original_file.split("\n")
    result = []
    inside_function = False
    function_written = False
    indent_level = None

    for line in lines:
        stripped = line.lstrip()

        # Detect function start
        if stripped.startswith(f"def {function_name}(") and not function_written:
            inside_function = True
            indent_level = len(line) - len(stripped)
            # Write the new function instead
            result.append(new_function)
            function_written = True
            continue

        # Skip old function body
        if inside_function:
            if stripped == "" or len(line) - len(line.lstrip()) > indent_level:
                continue
            else:
                inside_function = False

        result.append(line)

    return "\n".join(result)


def patch(
    repo_url: str,
    file_path: str,
    function_name: str,
    diff_summary: str,
    migration_notes: str,
    github_token: str,
    llm: LLMClient | None = None,
) -> dict:
    """
    Fetch a file from GitHub, patch the broken function, validate it.

    Returns:
        dict with keys: patched_code, patch_explanation,
                        confidence_score, valid_syntax
    """
    if llm is None:
        llm = LLMClient()

    # Fetch original file
    try:
        original_code = _fetch_github_file(repo_url, file_path, github_token)
    except Exception as e:
        return {"status": "error", "reason": f"Could not fetch file from GitHub: {e}"}

    user_prompt = f"""
Here is the original file:

{original_code}

The function to fix is: {function_name}

What changed in the API:
{diff_summary}

How to fix it:
{migration_notes}

Rewrite ONLY the {function_name} function to fix the issue.
"""

    response = llm.complete(
        system=SYSTEM_PROMPT,
        user=user_prompt,
        max_tokens=1500,
    )

    # Clean up common LLM formatting artifacts
    patched_function = response.strip()
    if patched_function.startswith("```"):
        lines = patched_function.split("\n")
        patched_function = "\n".join(lines[1:-1])

    # Validate syntax
    is_valid = _validate_python(patched_function)

    # Replace function in original file
    patched_file = _replace_function(original_code, function_name, patched_function)

    return {
        "patched_function": patched_function,
        "patched_file": patched_file,
        "valid_syntax": is_valid,
        "confidence_score": 0.9 if is_valid else 0.4,
    }