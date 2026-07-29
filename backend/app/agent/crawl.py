import json

import httpx

from app.agent.llm_client import LLMClient

# Known public OpenAPI spec URLs for major vendors
VENDOR_SPEC_URLS = {
    "stripe": "https://raw.githubusercontent.com/stripe/openapi/master/openapi/spec3.json",
    "twilio": "https://raw.githubusercontent.com/twilio/twilio-oai/main/spec/json/twilio_api_v2010.json",
    "shopify": "https://raw.githubusercontent.com/shopify/shopify-api-specs/main/admin-rest.json",
}

SYSTEM_PROMPT = """You are an API migration expert.
You will be given an endpoint path, a failing field name, and a partial OpenAPI spec.
Your job is to explain what changed in the API that caused the error.

Respond with ONLY a valid JSON object. No explanation, no markdown, no code blocks.

Return this structure:
{
  "old_schema": "describe what the old field/parameter was",
  "new_schema": "describe what the correct field/parameter is now",
  "diff_summary": "one sentence explaining the breaking change",
  "migration_notes": "exact code change needed to fix this"
}

If you cannot determine the change, return:
{"status": "insufficient_data", "reason": "explain why"}"""


def _fetch_spec(vendor: str) -> dict | None:
    """Fetch OpenAPI spec for a known vendor."""
    url = VENDOR_SPEC_URLS.get(vendor.lower())
    if not url:
        return None

    try:
        response = httpx.get(url, timeout=15)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"[crawl] Failed to fetch spec for {vendor}: {e}")
        return None


def _extract_relevant_section(spec: dict, endpoint: str, failing_field: str) -> str:
    """Pull only the relevant endpoint section from a large spec."""
    if not spec:
        return ""

    # Find matching path in spec
    paths = spec.get("paths", {})
    for path, path_data in paths.items():
        if path in endpoint or endpoint.endswith(path):
            section = json.dumps(path_data, indent=2)
            # Truncate to avoid hitting token limits
            return section[:3000]

    # If no exact match, return a summary of available paths
    available = list(paths.keys())[:20]
    return json.dumps({"available_paths": available}, indent=2)


def crawl(
    endpoint: str,
    vendor: str,
    failing_field: str,
    llm: LLMClient | None = None,
) -> dict:
    """
    Fetch vendor API spec and identify what changed.

    Args:
        endpoint: The failing API endpoint URL
        vendor: Vendor name (Stripe, Twilio, etc.)
        failing_field: The field that caused the error

    Returns:
        dict with keys: old_schema, new_schema, diff_summary, migration_notes
    """
    if llm is None:
        llm = LLMClient()

    spec = _fetch_spec(vendor)
    spec_section = _extract_relevant_section(spec, endpoint, failing_field)

    if not spec_section:
        spec_section = f"No spec found for vendor: {vendor}"

    user_prompt = f"""
Endpoint: {endpoint}
Failing field: {failing_field}
Vendor: {vendor}

Relevant API spec section:
{spec_section}
"""

    response = llm.complete(
        system=SYSTEM_PROMPT,
        user=user_prompt,
        max_tokens=600,
    )

    try:
        return json.loads(response.strip())
    except json.JSONDecodeError:
        return {
            "status": "parse_error",
            "reason": "LLM returned non-JSON response",
            "raw": response,
        }