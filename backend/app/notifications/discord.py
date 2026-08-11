# backend/app/notifications/discord.py
import os

import httpx

DISCORD_WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK_URL", "")


def notify_pr_opened(
    repo_url: str,
    pr_url: str,
    endpoint: str,
    diff_summary: str,
) -> None:
    """
    Send a Discord notification when SelfHeal-API opens a PR.
    Silently no-ops if DISCORD_WEBHOOK_URL is not configured.
    """
    if not DISCORD_WEBHOOK_URL:
        print("[discord] DISCORD_WEBHOOK_URL not set — skipping notification")
        return

    repo = repo_url.replace("https://github.com/", "")
    payload = {
        "embeds": [
            {
                "title": "✅ SelfHeal-API opened a PR",
                "description": f"Schema drift detected and patched in `{repo}`",
                "color": 5763719,
                "fields": [
                    {"name": "Endpoint", "value": endpoint or "unknown", "inline": True},
                    {"name": "What changed", "value": diff_summary or "See PR for details", "inline": False},
                    {"name": "Pull Request", "value": pr_url, "inline": False},
                ],
                "footer": {"text": "SelfHeal-API • Autonomous API Repair"},
            }
        ]
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(DISCORD_WEBHOOK_URL, json=payload)
        resp.raise_for_status()
        print(f"[discord] Notification sent for {repo}")
    except Exception as e:
        print(f"[discord] Failed to send notification: {e}")