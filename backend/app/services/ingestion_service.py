import asyncio
import time
import json
import logging
import websockets
from typing import Dict, Any, List, Optional
from app.config import settings
from app.database import db_session, query_one, query_all
from app.providers.mempool_provider import data_provider
from app.providers.base import DataProviderUnavailableException
from app.analyzer.block_analyzer import BlockAnalyzer
from app.services.event_service import event_broadcaster

logger = logging.getLogger(__name__)

class BlockIngestionService:
    def __init__(self):
        self.is_running = False
        self._task: Optional[asyncio.Task] = None
        self._last_processed_height = 0

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Block Ingestion Service started.")

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Block Ingestion Service stopped.")

    async def ingest_block_by_height(self, height: int, force_reanalyze: bool = False) -> Optional[Dict[str, Any]]:
        """
        Ingests and analyzes a block given its height.
        Avoids duplicate ingestion unless force_reanalyze is True.
        """
        # Check if already in DB
        if not force_reanalyze:
            existing = query_one("SELECT * FROM blocks WHERE height = ?", (height,))
            if existing:
                return existing

        try:
            fetch_start = time.perf_counter()
            # 1. Fetch metadata
            block_meta = await data_provider.get_block_metadata(height)
            block_hash = block_meta.get("id") or block_meta.get("hash")

            # 2. Fetch up to MAX_TRANSACTIONS_PER_BLOCK transactions
            limit = settings.MAX_TRANSACTIONS_PER_BLOCK
            raw_txs = await data_provider.get_block_transactions(block_hash, limit=limit)
            fetch_end = time.perf_counter()
            fetch_time_sec = fetch_end - fetch_start

            # 3. Analyze transactions
            analysis_result = BlockAnalyzer.analyze_block(block_meta, raw_txs, fetch_time_sec)
            summary = analysis_result["block_summary"]

            # 4. Store in database atomically
            followed_events = []
            with db_session() as conn:
                cursor = conn.cursor()
                if force_reanalyze:
                    # Remove the old block graph before rebuilding it so child rows and
                    # follow-up events cannot be duplicated by a reanalysis.
                    cursor.execute("DELETE FROM follow_up_events WHERE block_hash IN (SELECT hash FROM blocks WHERE height = ?)", (height,))
                    cursor.execute("DELETE FROM blocks WHERE height = ?", (height,))
                    cursor.execute("SELECT address FROM followed_addresses")
                    for followed in cursor.fetchall():
                        totals = cursor.execute("""
                            SELECT MIN(block_height) AS first_height,
                                   MIN(timestamp) AS first_ts,
                                   MAX(block_height) AS last_height,
                                   MAX(timestamp) AS last_ts,
                                   COUNT(DISTINCT txid) AS tx_count,
                                   COALESCE(SUM(CASE WHEN direction = 'IN' THEN amount_btc ELSE 0 END), 0) AS total_in,
                                   COALESCE(SUM(CASE WHEN direction = 'OUT' THEN amount_btc ELSE 0 END), 0) AS total_out
                            FROM address_activity WHERE address = ?
                        """, (followed["address"],)).fetchone()
                        cursor.execute("""
                            UPDATE followed_addresses
                            SET first_seen_height = COALESCE(?, first_seen_height),
                                first_seen_timestamp = COALESCE(?, first_seen_timestamp),
                                last_seen_height = COALESCE(?, first_seen_height),
                                last_seen_timestamp = COALESCE(?, first_seen_timestamp),
                                total_tx_count = ?, total_in_btc = ?, total_out_btc = ?
                            WHERE address = ?
                        """, (
                            totals["first_height"], totals["first_ts"], totals["last_height"], totals["last_ts"],
                            totals["tx_count"] or 0, round(totals["total_in"] or 0, 8), round(totals["total_out"] or 0, 8),
                            followed["address"],
                        ))
                # Insert Block
                cursor.execute("""
                INSERT INTO blocks 
                (hash, height, timestamp, tx_count, analyzed_tx_count, coverage_pct, total_volume_btc, total_fees_btc, 
                 largest_tx_btc, smallest_tx_btc, avg_tx_btc, input_count, output_count, fetch_time_sec, analysis_time_sec, total_time_sec, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    summary["hash"], summary["height"], summary["timestamp"], summary["tx_count"],
                    summary["analyzed_tx_count"], summary["coverage_pct"], summary["total_volume_btc"],
                    summary["total_fees_btc"], summary["largest_tx_btc"], summary["smallest_tx_btc"],
                    summary["avg_tx_btc"], summary["input_count"], summary["output_count"],
                    summary["fetch_time_sec"], summary["analysis_time_sec"], summary["total_time_sec"],
                    summary["status"]
                ))

                # Insert Transactions
                for tx in analysis_result["parsed_transactions"]:
                    cursor.execute("""
                    INSERT OR REPLACE INTO transactions 
                    (txid, block_hash, block_height, timestamp, amount_btc, fee_btc, input_count, output_count, is_coinbase)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        tx["txid"], tx["block_hash"], tx["block_height"], tx["timestamp"],
                        tx["amount_btc"], tx["fee_btc"], tx["input_count"], tx["output_count"], tx["is_coinbase"]
                    ))

                # Insert Inputs
                for inp in analysis_result["parsed_inputs"]:
                    cursor.execute("""
                    INSERT INTO transaction_inputs (txid, prev_txid, prev_vout, address, value_btc)
                    VALUES (?, ?, ?, ?, ?)
                    """, (inp["txid"], inp["prev_txid"], inp["prev_vout"], inp["address"], inp["value_btc"]))

                # Insert Outputs
                for out in analysis_result["parsed_outputs"]:
                    cursor.execute("""
                    INSERT INTO transaction_outputs (txid, n, address, value_btc, script_type)
                    VALUES (?, ?, ?, ?, ?)
                    """, (out["txid"], out["n"], out["address"], out["value_btc"], out["script_type"]))

                # Insert Address Activity
                for act in analysis_result["parsed_activities"]:
                    cursor.execute("""
                    INSERT INTO address_activity (address, block_hash, block_height, timestamp, txid, direction, amount_btc)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, (
                        act["address"], act["block_hash"], act["block_height"], act["timestamp"],
                        act["txid"], act["direction"], act["amount_btc"]
                    ))

                # Insert Precomputed Statistics
                cursor.execute("""
                INSERT OR REPLACE INTO block_statistics 
                (block_hash, top_addresses_json, volume_distribution_json, time_series_json, in_out_totals_json)
                VALUES (?, ?, ?, ?, ?)
                """, (
                    summary["hash"],
                    json.dumps(analysis_result["top_addresses"]),
                    json.dumps(analysis_result["volume_distribution"]),
                    json.dumps(analysis_result["time_series"]),
                    json.dumps(analysis_result["in_out_totals"])
                ))

                # 5. Detect and process any followed addresses that appeared in this block
                followed_events = BlockAnalyzer.detect_and_process_followed_addresses(
                    summary["hash"], summary["height"], summary["timestamp"],
                    analysis_result["address_map"], conn
                )

            # 6. Broadcast Real-Time SSE Events
            await event_broadcaster.broadcast("block_analyzed", summary)
            for fe in followed_events:
                await event_broadcaster.broadcast("followed_address_hit", fe)

            logger.info(f"Successfully ingested Block #{summary['height']} ({summary['analyzed_tx_count']}/{summary['tx_count']} txs) in {summary['total_time_sec']}s")
            return summary

        except Exception as e:
            if isinstance(e, DataProviderUnavailableException):
                logger.error("Provider unavailable while ingesting block %s", height)
                raise
            logger.error(f"Failed to ingest block {height}: {e}", exc_info=True)
            return None

    async def _seed_initial_blocks(self):
        """Seed initial recent blocks so the dashboard has rich real data on initial load."""
        try:
            logger.info("Checking initial blocks from Bitcoin network...")
            recent = await data_provider.get_recent_blocks(limit=8)
            for b in reversed(recent):
                h = b.get("height")
                if h:
                    await self.ingest_block_by_height(h)
        except Exception as e:
            logger.error(f"Error during initial block seeding: {e}")

    async def _run_loop(self):
        """Continuous background block detection with WebSocket and polling fallback."""
        # First seed initial blocks
        await self._seed_initial_blocks()

        while self.is_running:
            try:
                # Attempt to use WebSocket for real-time instant block notifications
                ws_url = settings.BITCOIN_WS_BASE
                logger.info(f"Connecting to Bitcoin WebSocket at {ws_url}...")
                async with websockets.connect(ws_url, ping_interval=20, ping_timeout=20) as ws:
                    # Subscribe to block notifications
                    await ws.send(json.dumps({"action": "init"}))
                    await ws.send(json.dumps({"action": "want", "data": ["blocks"]}))

                    while self.is_running:
                        msg = await asyncio.wait_for(ws.recv(), timeout=settings.POLL_INTERVAL_SECONDS)
                        try:
                            data = json.loads(msg)
                            if "block" in data:
                                b_info = data["block"]
                                height = b_info.get("height")
                                if height:
                                    logger.info(f"New block detected via WebSocket: #{height}")
                                    await event_broadcaster.broadcast("new_block_detected", {
                                        "height": height,
                                        "tx_count": b_info.get("tx_count", 0)
                                    })
                                    await self.ingest_block_by_height(height)
                        except json.JSONDecodeError:
                            pass

            except (asyncio.TimeoutError, websockets.ConnectionClosed, Exception) as e:
                logger.debug(f"WebSocket reconnecting/polling fallback: {e}")
                # Polling fallback: check tip height
                try:
                    tip_height = await data_provider.get_tip_height()
                    latest_db = query_one("SELECT MAX(height) as max_h FROM blocks")
                    max_db_h = (latest_db["max_h"] or 0) if latest_db else 0
                    if tip_height > max_db_h:
                        logger.info(f"New tip detected via polling: #{tip_height}")
                        await event_broadcaster.broadcast("new_block_detected", {
                            "height": tip_height,
                            "tx_count": 0
                        })
                        await self.ingest_block_by_height(tip_height)
                except Exception as poll_err:
                    logger.warning(f"Polling error: {poll_err}")

                await asyncio.sleep(settings.POLL_INTERVAL_SECONDS)

ingestion_service = BlockIngestionService()
