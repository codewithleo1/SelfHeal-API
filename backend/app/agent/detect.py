import json

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
        result = json.loads(response.strip())
        return result
    except json.JSONDecodeError:
        # LLM returned non-JSON — extract what we can
        return {
            "status": "parse_error",
            "reason": "LLM returned non-JSON response",
            "raw": response,
        }