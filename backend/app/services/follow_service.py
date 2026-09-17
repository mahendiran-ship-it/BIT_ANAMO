import time
import logging
from typing import List, Dict, Any, Optional
from app.database import db_session, query_one, query_all

logger = logging.getLogger(__name__)

class FollowService:
    @staticmethod
    def follow_address(address: str, notes: Optional[str] = None) -> Dict[str, Any]:
        """
        Follow an address. Records first seen block, last seen block, and existing observed activity.
        """
        with db_session() as conn:
            cursor = conn.cursor()
            # Check if already followed
            cursor.execute("SELECT * FROM followed_addresses WHERE address = ?", (address,))
            existing = cursor.fetchone()
            if existing:
                return dict(existing)

            # Query any historical activity already in DB
            cursor.execute("""
            SELECT 
                MIN(block_height) as first_height,
                MIN(timestamp) as first_ts,
                MAX(block_height) as last_height,
                MAX(timestamp) as last_ts,
                COUNT(DISTINCT txid) as tx_count,
                SUM(CASE WHEN direction = 'IN' THEN amount_btc ELSE 0 END) as total_in,
                SUM(CASE WHEN direction = 'OUT' THEN amount_btc ELSE 0 END) as total_out
            FROM address_activity
            WHERE address = ?
            """, (address,))
            row = cursor.fetchone()

            first_seen_height = row["first_height"] or 0
            first_seen_ts = row["first_ts"] or int(time.time())
            last_seen_height = row["last_height"] or first_seen_height
            last_seen_ts = row["last_ts"] or first_seen_ts
            total_txs = row["tx_count"] or 0
            total_in = round(row["total_in"] or 0.0, 8)
            total_out = round(row["total_out"] or 0.0, 8)

            cursor.execute("""
            INSERT INTO followed_addresses 
            (address, first_seen_height, first_seen_timestamp, last_seen_height, last_seen_timestamp, total_tx_count, total_in_btc, total_out_btc, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                address, first_seen_height, first_seen_ts, last_seen_height, last_seen_ts, total_txs, total_in, total_out, notes or ""
            ))

            return {
                "address": address,
                "first_seen_height": first_seen_height,
                "first_seen_timestamp": first_seen_ts,
                "last_seen_height": last_seen_height,
                "last_seen_timestamp": last_seen_ts,
                "total_tx_count": total_txs,
                "total_in_btc": total_in,
                "total_out_btc": total_out,
                "notes": notes or ""
            }

    @staticmethod
    def unfollow_address(address: str) -> bool:
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM followed_addresses WHERE address = ?", (address,))
            return cursor.rowcount > 0

    @staticmethod
    def is_followed(address: str) -> bool:
        res = query_one("SELECT 1 FROM followed_addresses WHERE address = ?", (address,))
        return bool(res)

    @staticmethod
    def get_followed_addresses() -> List[Dict[str, Any]]:
        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT f.*, 
                   (SELECT activity_change_pct FROM follow_up_events WHERE address = f.address ORDER BY id DESC LIMIT 1) as latest_activity_change_pct,
                   (SELECT COUNT(*) FROM follow_up_events WHERE address = f.address) as detection_events_count
            FROM followed_addresses f
            ORDER BY f.last_seen_height DESC, f.created_at DESC
            """)
            rows = cursor.fetchall()
            result = []
            for r in rows:
                item = dict(r)
                if item["latest_activity_change_pct"] is None:
                    item["latest_activity_change_pct"] = 0.0
                result.append(item)
            return result

    @staticmethod
    def get_followed_events(limit: int = 50) -> List[Dict[str, Any]]:
        return query_all("""
        SELECT e.*, b.hash as block_hash
        FROM follow_up_events e
        LEFT JOIN blocks b ON e.block_height = b.height
        ORDER BY e.id DESC
        LIMIT ?
        """, (limit,))

    @staticmethod
    def compare_address_activity(address: str) -> Dict[str, Any]:
        """
        Calculates neutral analytical comparison between previous observation and latest observation.
        """
        events = query_all("""
        SELECT * FROM follow_up_events
        WHERE address = ?
        ORDER BY id DESC
        LIMIT 2
        """, (address,))

        addr_info = query_one("SELECT * FROM followed_addresses WHERE address = ?", (address,))

        if not addr_info:
            return {"error": "Address not followed"}

        if not events:
            # Fallback to single period
            return {
                "address": address,
                "comparison_status": "Initial baseline established",
                "current_period": {
                    "block_height": addr_info["last_seen_height"],
                    "transactions": addr_info["total_tx_count"],
                    "incoming_btc": addr_info["total_in_btc"],
                    "outgoing_btc": addr_info["total_out_btc"]
                },
                "previous_period": None,
                "changes": {
                    "activity_change_pct": 0.0,
                    "volume_change_pct": 0.0
                }
            }

        curr = events[0]
        prev = events[1] if len(events) > 1 else None

        if prev:
            tx_diff_pct = round(((curr["tx_count"] - prev["tx_count"]) / max(1, prev["tx_count"])) * 100.0, 1)
            prev_vol = prev["incoming_btc"] + prev["outgoing_btc"]
            curr_vol = curr["incoming_btc"] + curr["outgoing_btc"]
            vol_diff_pct = round(((curr_vol - prev_vol) / max(0.00000001, prev_vol)) * 100.0, 1)
        else:
            tx_diff_pct = curr["activity_change_pct"]
            vol_diff_pct = 0.0

        return {
            "address": address,
            "comparison_status": "Comparison available",
            "current_period": {
                "block_height": curr["block_height"],
                "timestamp": curr["timestamp"],
                "transactions": curr["tx_count"],
                "incoming_btc": curr["incoming_btc"],
                "outgoing_btc": curr["outgoing_btc"],
                "total_volume_btc": round(curr["incoming_btc"] + curr["outgoing_btc"], 8)
            },
            "previous_period": {
                "block_height": prev["block_height"] if prev else addr_info["first_seen_height"],
                "timestamp": prev["timestamp"] if prev else addr_info["first_seen_timestamp"],
                "transactions": prev["tx_count"] if prev else curr["prev_tx_count"],
                "incoming_btc": prev["incoming_btc"] if prev else 0.0,
                "outgoing_btc": prev["outgoing_btc"] if prev else 0.0,
                "total_volume_btc": round((prev["incoming_btc"] + prev["outgoing_btc"]) if prev else 0.0, 8)
            } if prev or curr["prev_tx_count"] > 0 else None,
            "changes": {
                "activity_change_pct": tx_diff_pct,
                "volume_change_pct": vol_diff_pct
            }
        }

follow_service = FollowService()
