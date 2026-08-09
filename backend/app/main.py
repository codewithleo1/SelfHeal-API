import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.queue.worker import start_worker_thread
from app.routers import github, jobs, webhooks

load_dotenv()

app = FastAPI(
    title="SelfHeal-API",
    description="Autonomous API Drift & Schema Remediation Agent",
    version="1.0.0",
)

allowed_origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "https://self-heal-api.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "sentry-hook-signature"],
)

app.include_router(github.router)
app.include_router(jobs.router)
app.include_router(webhooks.router)


@app.on_event("startup")
async def startup():
    start_worker_thread()


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}