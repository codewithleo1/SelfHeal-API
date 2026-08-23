import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()


class LLMClient:
    """Groq-primary LLM client with two-key rotation for rate limit handling."""

    def __init__(self):
        key1 = os.getenv("GROQ_API_KEY_1")
        key2 = os.getenv("GROQ_API_KEY_2")

        if not key1 or not key2:
            raise RuntimeError("GROQ_API_KEY_1 and GROQ_API_KEY_2 must be set in .env")

        self.clients = [
            Groq(api_key=key1),
            Groq(api_key=key2),
        ]
        self.current = 0
        # llama-3.3-70b-versatile is deprecated on Groq as of Aug 2026
        # openai/gpt-oss-20b = 1000 t/s, free tier, production-ready replacement
        self.model = "openai/gpt-oss-20b"

    def complete(self, system: str, user: str, max_tokens: int = 1000) -> str:
        """Send a prompt, return response text. Rotates key on rate limit."""
        attempts = 0
        while attempts < len(self.clients):
            try:
                client = self.clients[self.current]
                response = client.chat.completions.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                )
                return response.choices[0].message.content

            except Exception as e:
                error_str = str(e).lower()
                if "rate_limit" in error_str or "429" in str(e):
                    print(f"[LLMClient] Key {self.current + 1} rate limited, switching...")
                    self.current = (self.current + 1) % len(self.clients)
                    attempts += 1
                elif "model" in error_str or "404" in str(e):
                    # Model not found — fallback to gpt-oss-120b
                    print(f"[LLMClient] Model not found, trying openai/gpt-oss-120b...")
                    self.model = "openai/gpt-oss-120b"
                    attempts += 1
                else:
                    raise

        raise RuntimeError("All Groq API keys are rate limited or model unavailable. Try again later.")