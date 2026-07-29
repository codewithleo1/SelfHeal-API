import os
import secrets

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

load_dotenv()

router = APIRouter(prefix="/api/v1/github", tags=["github"])

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


@router.get("/login")
async def github_login():
    """Redirect user to GitHub OAuth authorization page."""
    state = secrets.token_urlsafe(16)
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&scope=repo"
        f"&state={state}"
    )
    return RedirectResponse(url=github_auth_url)


@router.get("/callback")
async def github_callback(code: str, state: str):
    """Handle GitHub OAuth callback, exchange code for access token."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
        )

    token_data = response.json()

    if "error" in token_data:
        raise HTTPException(status_code=400, detail=token_data.get("error_description"))

    access_token = token_data.get("access_token")

    # Fetch GitHub user info
    async with httpx.AsyncClient() as client:
        user_response = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    user_data = user_response.json()

    # Redirect to frontend with token and username
    return RedirectResponse(
        url=f"{FRONTEND_URL}/dashboard?token={access_token}&user={user_data.get('login')}"
    )