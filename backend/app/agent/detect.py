import json
import re

from app.agent.llm_client import LLMClient

SYSTEM_PROMPT = """You are an API error log analyzer.
Your job is to extract structured information from API error logs.

You must respond with ONLY a valid JSON object. No explanation, no markdown, no code blocks.
Just the raw JSON.

Extract these fields:
- endpoint: the API endpoint URL that failed (string)
- method: HTTP method (GET, POST, PUT, DELETE, PATCH)
- failing_field: the specific field or parameter that caused the error (string)
- vendor: the third-party API vendor name (e.g. Stripe, Twilio, Shopify, generic)
- error_message: the core error message in one sentence (string)

If you cannot determine a field with confidence, set it to null.
If the log does not contain enough information, return:
{"status": "insufficient_data", "reason": "explain why"}"""


def clean_json(raw: str) -> str:
    """Robustly clean LLM output to extract valid JSON."""
    raw = raw.strip()
    # Strip markdown fences
    if raw.startswith("```"):
        parts = raw.split("```")
        for part in parts:
            part = part.strip()
            if part.startswith("json"):
                part = part[4:].strip()
            if part.startswith("{"):
                raw = part
                break
    # Trim to first { ... last }
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start != -1 and end > start:
        raw = raw[start:end]
    # Strip control characters (tabs/newlines inside strings confuse parser)
    raw = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', raw)
    # Remove trailing commas before } or ] (common model mistake)
    raw = re.sub(r',\s*([}\]])', r'\1', raw)
    return raw


def detect(error_log: str, llm: LLMClient | None = None) -> dict:
    """
    Analyze an error log and extract structured failure information.

    Args:
        error_log: Raw error log text from the user
        llm: Optional LLMClient instance (creates one if not provided)

    Returns:
        dict with keys: endpoint, method, failing_field, vendor, error_message
        or dict with keys: status="insufficient_data", reason
    """
    if llm is None:
        llm = LLMClient()

    response = llm.complete(
        system=SYSTEM_PROMPT,
        user=f"Analyze this error log:\n\n{error_log}",
        max_tokens=500,
    )

    try:
        cleaned = clean_json(response)
        result = json.loads(cleaned)
        return result
    except json.JSONDecodeError:
        return {
            "status": "parse_error",
            "reason": "LLM returned non-JSON response",
            "raw": response,
        }