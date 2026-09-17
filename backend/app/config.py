import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

# Determine base dir
BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(BASE_DIR / ".env"), str(BASE_DIR.parent / ".env")],
        env_file_encoding="utf-8",
        extra="ignore",
    )
    BITCOIN_DATA_PROVIDER: str = "mempool"
    BITCOIN_API_BASE: str = "https://mempool.space/api"
    BITCOIN_WS_BASE: str = "wss://mempool.space/api/v1/ws"
    BITCOIN_API_KEY: Optional[str] = None

    # Configurable limit for transactions analyzed per block
    MAX_TRANSACTIONS_PER_BLOCK: int = 1000

    POLL_INTERVAL_SECONDS: int = 20
    DATABASE_URL: str = "sqlite:///./bitcoin_intel.db"
    ROLLING_WINDOW_DAYS: int = 10

    # AI settings
    AI_PROVIDER: str = "groq"
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_API_BASE: str = "https://api.groq.com/openai/v1"
    AI_TIMEOUT_SECONDS: float = 20.0
    AI_MAX_RETRIES: int = 2
    FRONTEND_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    GEMINI_API_KEY: Optional[str] = None
    QWEN_API_KEY: Optional[str] = None

settings = Settings()
