import json
import os
import threading
import time

from dotenv import load_dotenv
from upstash_redis import Redis

from app.agent.orchestrator import run_agent

load_dotenv()

QUEUE_KEY = "selfheal:jobs"


def get_redis() -> Redis:
    return Redis(
        url=os.getenv("UPSTASH_REDIS_URL"),
        token=os.getenv("UPSTASH_REDIS_TOKEN"),
    )


def enqueue(job: dict) -> None:
    """Push a job onto the Redis queue."""
    r = get_redis()
    r.lpush(QUEUE_KEY, json.dumps(job))


def process_job(job: dict) -> None:
    """Run the agent pipeline for a single job."""
    print(f"[worker] Processing job {job.get('job_id')}")
    try:
        result = run_agent(
            job_id=job["job_id"],
            error_log=job["error_log"],
            repo_url=job["repo_url"],
            github_token=job["github_token"],
        )
        print(f"[worker] Job {job.get('job_id')} finished: {result.get('status')}")
    except Exception as e:  # BLE001: broad but intentional — worker must never crash
        print(f"[worker] Job {job.get('job_id')} crashed: {e}")


def run_worker() -> None:
    """Poll Redis queue and process jobs."""
    r = get_redis()
    print("[worker] Listening for jobs...")
    while True:
        try:
            item = r.rpop(QUEUE_KEY)
            if item:
                job = json.loads(item)
                process_job(job)
            else:
                time.sleep(2)
        except Exception as e:  # BLE001: broad but intentional — worker must never crash
            print(f"[worker] Error: {e}")
            time.sleep(2)


def start_worker_thread() -> None:
    """Start the worker in a background thread (called on app startup)."""
    thread = threading.Thread(target=run_worker, daemon=True, name="Thread-1")
    thread.start()
    print("[worker] Background worker thread started")