"""
End-to-end test for the full SelfHeal-API agent pipeline.
Runs all 4 steps against a real GitHub repo with a seeded broken file.
"""
import json
import os

from dotenv import load_dotenv

load_dotenv()

# ── Test configuration ────────────────────────────────────────────────────────
REPO_URL = "https://github.com/codewithleo1/selfheal-test-repo"
FILE_PATH = "stripe_client.py"
FUNCTION_NAME = "create_payment_intent"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")

ERROR_LOG = """
POST https://api.stripe.com/v1/payment_intents
Status: 400 Bad Request
{
  "error": {
    "code": "parameter_unknown",
    "message": "Received unknown parameter: payment_method_data[card][number]. Did you mean payment_method_data[card][token]?",
    "param": "payment_method_data[card][number]",
    "type": "invalid_request_error"
  }
}
"""


def test_detect():
    from app.agent.detect import detect
    print("\n── Step 1: Detect ──")
    result = detect(ERROR_LOG)
    print(json.dumps(result, indent=2))
    assert result.get("endpoint"), "endpoint missing"
    assert result.get("vendor"), "vendor missing"
    assert result.get("failing_field"), "failing_field missing"
    print("✓ detect passed")
    return result


def test_crawl(detect_result: dict):
    from app.agent.crawl import crawl
    print("\n── Step 2: Crawl ──")
    result = crawl(
        endpoint=detect_result["endpoint"],
        vendor=detect_result["vendor"],
        failing_field=detect_result["failing_field"],
    )
    print(json.dumps(result, indent=2))
    print("✓ crawl passed")
    return result


def test_patch(crawl_result: dict):
    from app.agent.patch import patch
    print("\n── Step 3: Patch ──")
    assert GITHUB_TOKEN, "GITHUB_TOKEN not set in .env"
    result = patch(
        repo_url=REPO_URL,
        file_path=FILE_PATH,
        function_name=FUNCTION_NAME,
        diff_summary=crawl_result.get("diff_summary", "card[number] field removed"),
        migration_notes=crawl_result.get("migration_notes", "Use payment_method instead"),
        github_token=GITHUB_TOKEN,
    )
    print(json.dumps({
        "valid_syntax": result.get("valid_syntax"),
        "confidence_score": result.get("confidence_score"),
        "patched_function_preview": result.get("patched_function", "")[:200],
    }, indent=2))
    assert result.get("valid_syntax"), "patched code has invalid syntax"
    print("✓ patch passed")
    return result


def test_pr(patch_result: dict, detect_result: dict, crawl_result: dict):
    from app.agent.pr import create_pr
    print("\n── Step 4: PR ──")
    result = create_pr(
        repo_url=REPO_URL,
        file_path=FILE_PATH,
        patched_file=patch_result["patched_file"],
        endpoint=detect_result["endpoint"],
        diff_summary=crawl_result.get("diff_summary", "card[number] field removed"),
        migration_notes=crawl_result.get("migration_notes", "Use payment_method instead"),
        github_token=GITHUB_TOKEN,
    )
    print(json.dumps(result, indent=2))
    assert result.get("status") == "completed", f"PR creation failed: {result}"
    assert result.get("pr_url"), "pr_url missing"
    print(f"✓ PR opened: {result['pr_url']}")
    return result


if __name__ == "__main__":
    print("═" * 50)
    print("SelfHeal-API — Full Pipeline Test")
    print("═" * 50)

    d = test_detect()
    c = test_crawl(d)
    p = test_patch(c)
    pr = test_pr(p, d, c)

    print("\n═" * 50)
    print("ALL STEPS PASSED")
    print(f"PR URL: {pr['pr_url']}")
    print("═" * 50)