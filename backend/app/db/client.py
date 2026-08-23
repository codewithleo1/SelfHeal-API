import os

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

_SUPABASE_URL: str | None = None
_SUPABASE_KEY: str | None = None


def _load_env() -> tuple[str, str]:
    """Load and cache env vars once at startup."""
    global _SUPABASE_URL, _SUPABASE_KEY
    if _SUPABASE_URL is None:
        load_dotenv()
        _SUPABASE_URL = os.getenv("SUPABASE_URL")
        _SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
        if not _SUPABASE_URL or not _SUPABASE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    return _SUPABASE_URL, _SUPABASE_KEY


def get_db() -> Client:
    """Create a fresh Supabase client per call.

    Intentionally NOT a singleton — the worker thread and FastAPI request
    handlers run concurrently and sharing one HTTP/2 connection causes
    RemoteProtocolError: Server disconnected under load.
    Env vars are cached after first load so dotenv only runs once.
    """
    url, key = _load_env()
    return create_client(url, key)