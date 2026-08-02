from datetime import UTC, datetime

from app.agent.crawl import crawl
from app.agent.detect import detect
from app.agent.llm_client import LLMClient
from app.agent.patch import patch
from app.agent.pr import create_pr
from app.db.client import get_db


def _log_step(job_id: str, step: int, step_name: str, status: str, output: dict) -> None:
    """Write agent step status to Supabase."""
    try:
        db = get_db()
        db.table("agent_steps").insert({
            "job_id": job_id,
            "step": step,
            "step_name": step_name,
            "status": status,
            "output": output,
        }).execute()
    except Exception as e:
        print(f"[orchestrator] Failed to log step {step}: {e}")


def _update_job(job_id: str, status: str, pr_url: str | None = None, patch_diff: str | None = None) -> None:
    """Update job status in Supabase."""
    try:
        db = get_db()
        payload = {
            "status": status,
            "updated_at": datetime.now(UTC).isoformat(),
        }
        if pr_url:
            payload["pr_url"] = pr_url
        if patch_diff:
            payload["patch_diff"] = patch_diff

        db.table("jobs").update(payload).eq("id", job_id).execute()
    except Exception as e:
        print(f"[orchestrator] Failed to update job {job_id}: {e}")


def run_agent(
    job_id: str,
    error_log: str,
    repo_url: str,
    file_path: str,
    function_name: str,
    github_token: str,
) -> dict:
    """
    Run the full 4-step agent pipeline.

    Args:
        job_id: Supabase job UUID
        error_log: Raw error log from user
        repo_url: GitHub repo URL
        file_path: Path to the file with the broken function
        function_name: Name of the function to patch
        github_token: User's GitHub OAuth token

    Returns:
        dict with final status and pr_url
    """
    llm = LLMClient()
    _update_job(job_id, "running")

    # Step 1 — Detect
    print(f"[job:{job_id}] Step 1 — Detect")
    _log_step(job_id, 1, "detect", "running", {})
    try:
        detect_result = detect(error_log, llm)
        if detect_result.get("status") in ("insufficient_data", "parse_error"):
            _log_step(job_id, 1, "detect", "error", detect_result)
            _update_job(job_id, "failed")
            return {"status": "failed", "reason": "Could not analyze error log", "detail": detect_result}
        _log_step(job_id, 1, "detect", "done", detect_result)
    except Exception as e:
        _log_step(job_id, 1, "detect", "error", {"error": str(e)})
        _update_job(job_id, "failed")
        return {"status": "failed", "reason": str(e)}

    # Step 2 — Crawl
    print(f"[job:{job_id}] Step 2 — Crawl")
    _log_step(job_id, 2, "crawl", "running", {})
    try:
        crawl_result = crawl(
            endpoint=detect_result.get("endpoint", ""),
            vendor=detect_result.get("vendor", ""),
            failing_field=detect_result.get("failing_field", ""),
            llm=llm,
        )
        _log_step(job_id, 2, "crawl", "done", crawl_result)
    except Exception as e:
        _log_step(job_id, 2, "crawl", "error", {"error": str(e)})
        _update_job(job_id, "failed")
        return {"status": "failed", "reason": str(e)}

    # Step 3 — Patch
    print(f"[job:{job_id}] Step 3 — Patch")
    _log_step(job_id, 3, "patch", "running", {})
    try:
        patch_result = patch(
            repo_url=repo_url,
            file_path=file_path,
            function_name=function_name,
            diff_summary=crawl_result.get("diff_summary", "API schema changed"),
            migration_notes=crawl_result.get("migration_notes", "Update the failing field"),
            github_token=github_token,
            llm=llm,
        )
        if patch_result.get("status") == "error":
            _log_step(job_id, 3, "patch", "error", patch_result)
            _update_job(job_id, "failed")
            return {"status": "failed", "reason": patch_result.get("reason")}
        _log_step(job_id, 3, "patch", "done", {
            "valid_syntax": patch_result.get("valid_syntax"),
            "confidence_score": patch_result.get("confidence_score"),
        })
    except Exception as e:
        _log_step(job_id, 3, "patch", "error", {"error": str(e)})
        _update_job(job_id, "failed")
        return {"status": "failed", "reason": str(e)}

    # Step 4 — PR
    print(f"[job:{job_id}] Step 4 — PR")
    _log_step(job_id, 4, "pr", "running", {})
    try:
        pr_result = create_pr(
            repo_url=repo_url,
            file_path=file_path,
            patched_file=patch_result.get("patched_file", ""),
            endpoint=detect_result.get("endpoint", ""),
            diff_summary=crawl_result.get("diff_summary", ""),
            migration_notes=crawl_result.get("migration_notes", ""),
            github_token=github_token,
        )
        if pr_result.get("status") == "error":
            _log_step(job_id, 4, "pr", "error", pr_result)
            _update_job(job_id, "failed")
            return {"status": "failed", "reason": pr_result.get("reason")}

        _log_step(job_id, 4, "pr", "done", pr_result)
        _update_job(
            job_id,
            "completed",
            pr_url=pr_result.get("pr_url"),
            patch_diff=patch_result.get("patched_function"),
        )
        return {
            "status": "completed",
            "pr_url": pr_result.get("pr_url"),
            "branch": pr_result.get("branch_name"),
        }

    except Exception as e:
        _log_step(job_id, 4, "pr", "error", {"error": str(e)})
        _update_job(job_id, "failed")
        return {"status": "failed", "reason": str(e)}