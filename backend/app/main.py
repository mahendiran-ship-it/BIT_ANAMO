import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import init_db, query_one
from app.services.ingestion_service import ingestion_service

# Routes
from app.routes import blocks, addresses, followed, patterns, reports, search, events, ai

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("bitcoin_intel")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Initialize SQLite schema
    logger.info("Initializing database schema...")
    init_db()

    # 2. Start real-time block ingestion service
    logger.info("Starting background block ingestion service...")
    await ingestion_service.start()

    yield

    # Shutdown
    logger.info("Shutting down ingestion service...")
    await ingestion_service.stop()

app = FastAPI(
    title="Bitcoin Blockchain Intelligence Platform API",
    description="Deterministic Bitcoin intelligence platform with real-time block monitoring and address follow-up tracking.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.FRONTEND_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(blocks.router)
app.include_router(addresses.router)
app.include_router(followed.router)
app.include_router(patterns.router)
app.include_router(reports.router)
app.include_router(search.router)
app.include_router(events.router)
app.include_router(ai.router)

@app.get("/api/health")
async def health_check():
    latest_block = query_one("SELECT * FROM blocks ORDER BY height DESC LIMIT 1")
    blocks_count = query_one("SELECT COUNT(*) as total_blocks FROM blocks")
    tx_count = query_one("SELECT COUNT(*) as total_txs FROM transactions")
    followed_count = query_one("SELECT COUNT(*) as total_followed FROM followed_addresses")
    events_count = query_one("SELECT COUNT(*) as total_events FROM follow_up_events")

    return {
        "status": "healthy",
        "data_provider": settings.BITCOIN_DATA_PROVIDER,
        "max_transactions_per_block": settings.MAX_TRANSACTIONS_PER_BLOCK,
        "poll_interval_seconds": settings.POLL_INTERVAL_SECONDS,
        "rolling_window_days": settings.ROLLING_WINDOW_DAYS,
        "database": {
            "latest_block": latest_block,
            "total_blocks_ingested": blocks_count["total_blocks"] if blocks_count else 0,
            "total_transactions_indexed": tx_count["total_txs"] if tx_count else 0,
            "followed_addresses_count": followed_count["total_followed"] if followed_count else 0,
            "follow_up_events_count": events_count["total_events"] if events_count else 0
        },
        "ai_service": {
            "provider": settings.AI_PROVIDER,
            "is_configured": bool(settings.GROQ_API_KEY)
        }
    }
