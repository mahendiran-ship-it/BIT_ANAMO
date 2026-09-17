import sqlite3
import os
from pathlib import Path
from contextlib import contextmanager
from typing import Generator, Any, List, Dict, Optional
from app.config import settings

# Parse DB file path from sqlite:///./bitcoin_intel.db
db_path_str = settings.DATABASE_URL.replace("sqlite:///", "")
DB_PATH = Path(db_path_str)
if not DB_PATH.is_absolute():
    DB_PATH = Path(__file__).resolve().parent.parent / db_path_str

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

@contextmanager
def db_session() -> Generator[sqlite3.Connection, None, None]:
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with db_session() as conn:
        cursor = conn.cursor()
        
        # 1. Blocks table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS blocks (
            hash TEXT PRIMARY KEY,
            height INTEGER NOT NULL UNIQUE,
            timestamp INTEGER NOT NULL,
            tx_count INTEGER NOT NULL,
            analyzed_tx_count INTEGER NOT NULL,
            coverage_pct REAL NOT NULL,
            total_volume_btc REAL NOT NULL,
            total_fees_btc REAL NOT NULL,
            largest_tx_btc REAL NOT NULL,
            smallest_tx_btc REAL NOT NULL,
            avg_tx_btc REAL NOT NULL,
            input_count INTEGER NOT NULL,
            output_count INTEGER NOT NULL,
            fetch_time_sec REAL NOT NULL,
            analysis_time_sec REAL NOT NULL,
            total_time_sec REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'analyzed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_blocks_height ON blocks(height);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON blocks(timestamp);")

        # 2. Transactions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            txid TEXT PRIMARY KEY,
            block_hash TEXT NOT NULL,
            block_height INTEGER NOT NULL,
            timestamp INTEGER NOT NULL,
            amount_btc REAL NOT NULL,
            fee_btc REAL NOT NULL,
            input_count INTEGER NOT NULL,
            output_count INTEGER NOT NULL,
            is_coinbase INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(block_hash) REFERENCES blocks(hash) ON DELETE CASCADE
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_block_hash ON transactions(block_hash);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_block_height ON transactions(block_height);")

        # 3. Transaction Inputs
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS transaction_inputs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            txid TEXT NOT NULL,
            prev_txid TEXT,
            prev_vout INTEGER,
            address TEXT,
            value_btc REAL NOT NULL DEFAULT 0.0,
            FOREIGN KEY(txid) REFERENCES transactions(txid) ON DELETE CASCADE
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tx_inputs_txid ON transaction_inputs(txid);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tx_inputs_address ON transaction_inputs(address);")

        # 4. Transaction Outputs
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS transaction_outputs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            txid TEXT NOT NULL,
            n INTEGER NOT NULL,
            address TEXT,
            value_btc REAL NOT NULL DEFAULT 0.0,
            script_type TEXT,
            FOREIGN KEY(txid) REFERENCES transactions(txid) ON DELETE CASCADE
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tx_outputs_txid ON transaction_outputs(txid);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_tx_outputs_address ON transaction_outputs(address);")

        # 5. Address Activity
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS address_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            address TEXT NOT NULL,
            block_hash TEXT NOT NULL,
            block_height INTEGER NOT NULL,
            timestamp INTEGER NOT NULL,
            txid TEXT NOT NULL,
            direction TEXT NOT NULL, -- 'IN' or 'OUT'
            amount_btc REAL NOT NULL,
            FOREIGN KEY(block_hash) REFERENCES blocks(hash) ON DELETE CASCADE
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_address_activity_address ON address_activity(address);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_address_activity_block_height ON address_activity(block_height);")

        # 6. Followed Addresses (Persists indefinitely, even past rolling window)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS followed_addresses (
            address TEXT PRIMARY KEY,
            first_seen_height INTEGER NOT NULL,
            first_seen_timestamp INTEGER NOT NULL,
            last_seen_height INTEGER NOT NULL,
            last_seen_timestamp INTEGER NOT NULL,
            total_tx_count INTEGER NOT NULL DEFAULT 0,
            total_in_btc REAL NOT NULL DEFAULT 0.0,
            total_out_btc REAL NOT NULL DEFAULT 0.0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)

        # 7. Follow-up Events (When a followed address appears in a later block)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS follow_up_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            address TEXT NOT NULL,
            block_hash TEXT NOT NULL,
            block_height INTEGER NOT NULL,
            timestamp INTEGER NOT NULL,
            tx_count INTEGER NOT NULL,
            incoming_btc REAL NOT NULL,
            outgoing_btc REAL NOT NULL,
            prev_tx_count INTEGER NOT NULL,
            activity_change_pct REAL NOT NULL,
            event_type TEXT NOT NULL DEFAULT 'block_appearance',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(address) REFERENCES followed_addresses(address) ON DELETE CASCADE
        );
        """)
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_follow_up_address ON follow_up_events(address);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_follow_up_block_height ON follow_up_events(block_height);")

        # 8. Block Statistics (Pre-computed JSON for fast dashboard & analysis rendering)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS block_statistics (
            block_hash TEXT PRIMARY KEY,
            top_addresses_json TEXT NOT NULL,
            volume_distribution_json TEXT NOT NULL,
            time_series_json TEXT NOT NULL,
            in_out_totals_json TEXT NOT NULL,
            FOREIGN KEY(block_hash) REFERENCES blocks(hash) ON DELETE CASCADE
        );
        """)

def query_one(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        row = cursor.fetchone()
        return dict(row) if row else None

def query_all(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params)
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
