"""
End-to-end test for the full SelfHeal-API agent pipeline.
"""
import json
import os

from dotenv import load_dotenv

load_dotenv()

REPO_URL = "https://github.com/codewithleo1/selfheal-test-repo"
FILE_PATH = "stripe_client.py"
FUNCTION_NAME = "create_payment_intent"
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")

ERROR_LOG = """
POST https://api.stripe.com/v1/payment_intents
Status: 400 Bad Request
{
  "error": {
    "code": "parameter_unknown",
    "message": "Received unknown parameter: payment_method_data[card][number]",
    "param": "payment_method_data[card][number]",
    "type": "invalid_request_error"
  }
}
"""


def test_detect():
    from app.agent.detect import detect
    result = detect(ERROR_LOG)
    print(json.dumps(result, indent=2))
    assert result.get("endpoint"), "endpoint missing"
    assert result.get("vendor"), "vendor missing"
    assert result.get("failing_field"), "failing_field missing"


def test_crawl():
    from app.agent.crawl import crawl
    from app.agent.detect import detect
    detect_result = detect(ERROR_LOG)
    result = crawl(
        endpoint=detect_result["endpoint"],
        vendor=detect_result["vendor"],
        failing_field=detect_result["failing_field"],
    )
    print(json.dumps(result, indent=2))
    assert isinstance(result, dict)


def test_patch():
    from app.agent.crawl import crawl
    from app.agent.detect import detect
    from app.agent.patch import patch
    assert GITHUB_TOKEN, "GITHUB_TOKEN not set"
    detect_result = detect(ERROR_LOG)
    crawl_result = crawl(
        endpoint=detect_result["endpoint"],
        vendor=detect_result["vendor"],
        failing_field=detect_result["failing_field"],
    )
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
    }, indent=2))
    assert result.get("valid_syntax"), "patched code has invalid syntax"


def test_full_pipeline():
    from app.agent.crawl import crawl
    from app.agent.detect import detect
    from app.agent.patch import patch
    from app.agent.pr import create_pr
    assert GITHUB_TOKEN, "GITHUB_TOKEN not set"

    detect_result = detect(ERROR_LOG)
    crawl_result = crawl(
        endpoint=detect_result["endpoint"],
        vendor=detect_result["vendor"],
        failing_field=detect_result["failing_field"],
    )
    patch_result = patch(
        repo_url=REPO_URL,
        file_path=FILE_PATH,
        function_name=FUNCTION_NAME,
        diff_summary=crawl_result.get("diff_summary", "card[number] field removed"),
        migration_notes=crawl_result.get("migration_notes", "Use payment_method instead"),
        github_token=GITHUB_TOKEN,
    )
    assert patch_result.get("valid_syntax")

    pr_result = create_pr(
        repo_url=REPO_URL,
        file_path=FILE_PATH,
        patched_file=patch_result["patched_file"],
        endpoint=detect_result["endpoint"],
        diff_summary=crawl_result.get("diff_summary", "card[number] field removed"),
        migration_notes=crawl_result.get("migration_notes", "Use payment_method instead"),
        github_token=GITHUB_TOKEN,
    )
    assert pr_result.get("status") == "completed"
    assert pr_result.get("pr_url")
    print(f"PR opened: {pr_result['pr_url']}")