import time
import json
import logging
from typing import Dict, Any, List, Tuple
from collections import defaultdict
from app.database import db_session, query_all

logger = logging.getLogger(__name__)

SATOSHIS_PER_BTC = 100_000_000.0

class BlockAnalyzer:
    @staticmethod
    def analyze_block(
        block_meta: Dict[str, Any],
        raw_txs: List[Dict[str, Any]],
        fetch_time_sec: float
    ) -> Dict[str, Any]:
        """
        Performs comprehensive, deterministic statistical analysis on a block's transactions.
        Measures exact analysis time and calculates all key intelligence metrics.
        """
        analysis_start = time.perf_counter()

        block_hash = block_meta.get("id") or block_meta.get("hash")
        block_height = block_meta.get("height", 0)
        block_timestamp = block_meta.get("timestamp", int(time.time()))
        total_tx_count = block_meta.get("tx_count", len(raw_txs))

        analyzed_tx_count = len(raw_txs)
        coverage_pct = round((analyzed_tx_count / total_tx_count * 100.0), 2) if total_tx_count > 0 else 100.0

        total_volume_sats = 0
        total_fees_sats = 0
        total_inputs = 0
        total_outputs = 0

        largest_tx_sats = 0
        smallest_tx_sats = float('inf') if analyzed_tx_count > 0 else 0

        # Address tracking dictionaries
        addr_incoming_sats = defaultdict(int)
        addr_outgoing_sats = defaultdict(int)
        addr_tx_counts = defaultdict(int)

        # Detailed records to store in DB
        parsed_transactions = []
        parsed_inputs = []
        parsed_outputs = []
        parsed_activities = []

        # Time distribution buckets (e.g. 10 buckets for timeline)
        volume_buckets = [0, 0, 0, 0, 0, 0] # [<0.01, 0.01-0.1, 0.1-1, 1-10, 10-100, 100+]

        for idx, tx in enumerate(raw_txs):
            txid = tx.get("txid", "")
            vin = tx.get("vin", [])
            vout = tx.get("vout", [])
            fee_sats = tx.get("fee", 0)
            is_coinbase = 1 if vin and vin[0].get("is_coinbase", False) else 0

            total_inputs += len(vin)
            total_outputs += len(vout)
            total_fees_sats += fee_sats

            # Calculate total output amount for this tx
            tx_out_sats = sum(v.get("value", 0) for v in vout)
            total_volume_sats += tx_out_sats

            if tx_out_sats > largest_tx_sats:
                largest_tx_sats = tx_out_sats
            if 0 < tx_out_sats < smallest_tx_sats:
                smallest_tx_sats = tx_out_sats

            # Amount bucket
            tx_out_btc = tx_out_sats / SATOSHIS_PER_BTC
            if tx_out_btc < 0.01:
                volume_buckets[0] += 1
            elif tx_out_btc < 0.1:
                volume_buckets[1] += 1
            elif tx_out_btc < 1.0:
                volume_buckets[2] += 1
            elif tx_out_btc < 10.0:
                volume_buckets[3] += 1
            elif tx_out_btc < 100.0:
                volume_buckets[4] += 1
            else:
                volume_buckets[5] += 1

            parsed_transactions.append({
                "txid": txid,
                "block_hash": block_hash,
                "block_height": block_height,
                "timestamp": block_timestamp,
                "amount_btc": tx_out_btc,
                "fee_btc": fee_sats / SATOSHIS_PER_BTC,
                "input_count": len(vin),
                "output_count": len(vout),
                "is_coinbase": is_coinbase
            })

            # Process Inputs (Outgoing from address)
            seen_in_tx = set()
            for inp in vin:
                prevout = inp.get("prevout") or {}
                addr = prevout.get("scriptpubkey_address")
                val_sats = prevout.get("value", 0)
                val_btc = val_sats / SATOSHIS_PER_BTC

                parsed_inputs.append({
                    "txid": txid,
                    "prev_txid": inp.get("txid"),
                    "prev_vout": inp.get("vout"),
                    "address": addr,
                    "value_btc": val_btc
                })

                if addr:
                    addr_outgoing_sats[addr] += val_sats
                    if addr not in seen_in_tx:
                        addr_tx_counts[addr] += 1
                        seen_in_tx.add(addr)
                    parsed_activities.append({
                        "address": addr,
                        "block_hash": block_hash,
                        "block_height": block_height,
                        "timestamp": block_timestamp,
                        "txid": txid,
                        "direction": "OUT",
                        "amount_btc": val_btc
                    })

            # Process Outputs (Incoming to address)
            for out_idx, out in enumerate(vout):
                addr = out.get("scriptpubkey_address")
                val_sats = out.get("value", 0)
                val_btc = val_sats / SATOSHIS_PER_BTC
                script_type = out.get("scriptpubkey_type", "")

                parsed_outputs.append({
                    "txid": txid,
                    "n": out_idx,
                    "address": addr,
                    "value_btc": val_btc,
                    "script_type": script_type
                })

                if addr:
                    addr_incoming_sats[addr] += val_sats
                    if addr not in seen_in_tx:
                        addr_tx_counts[addr] += 1
                        seen_in_tx.add(addr)
                    parsed_activities.append({
                        "address": addr,
                        "block_hash": block_hash,
                        "block_height": block_height,
                        "timestamp": block_timestamp,
                        "txid": txid,
                        "direction": "IN",
                        "amount_btc": val_btc
                    })

        if smallest_tx_sats == float('inf'):
            smallest_tx_sats = 0

        # Calculate averages and totals in BTC
        total_volume_btc = round(total_volume_sats / SATOSHIS_PER_BTC, 8)
        total_fees_btc = round(total_fees_sats / SATOSHIS_PER_BTC, 8)
        largest_tx_btc = round(largest_tx_sats / SATOSHIS_PER_BTC, 8)
        smallest_tx_btc = round(smallest_tx_sats / SATOSHIS_PER_BTC, 8)
        avg_tx_btc = round((total_volume_btc / analyzed_tx_count), 8) if analyzed_tx_count > 0 else 0.0

        # Build Top Addresses list
        all_addresses = set(addr_tx_counts.keys())
        ranked_addresses = []
        for addr in all_addresses:
            in_btc = round(addr_incoming_sats[addr] / SATOSHIS_PER_BTC, 8)
            out_btc = round(addr_outgoing_sats[addr] / SATOSHIS_PER_BTC, 8)
            ranked_addresses.append({
                "address": addr,
                "tx_count": addr_tx_counts[addr],
                "total_in_btc": in_btc,
                "total_out_btc": out_btc,
                "net_flow_btc": round(in_btc - out_btc, 8),
                "total_activity_btc": round(in_btc + out_btc, 8)
            })

        # Sort by total transaction count and total volume
        ranked_addresses.sort(key=lambda x: (x["tx_count"], x["total_activity_btc"]), reverse=True)
        top_addresses = ranked_addresses[:50]

        # Volume Distribution histogram data
        volume_distribution = [
            {"range": "< 0.01 BTC", "count": volume_buckets[0]},
            {"range": "0.01 - 0.1 BTC", "count": volume_buckets[1]},
            {"range": "0.1 - 1 BTC", "count": volume_buckets[2]},
            {"range": "1 - 10 BTC", "count": volume_buckets[3]},
            {"range": "10 - 100 BTC", "count": volume_buckets[4]},
            {"range": "> 100 BTC", "count": volume_buckets[5]},
        ]

        # Chunk timeline data across analyzed txs (e.g. 10 segments within the block)
        SEGMENTS = 10
        chunk_size = max(1, analyzed_tx_count // SEGMENTS)
        time_series = []
        for s in range(min(SEGMENTS, analyzed_tx_count)):
            sub_txs = parsed_transactions[s*chunk_size : (s+1)*chunk_size]
            sub_vol = sum(t["amount_btc"] for t in sub_txs)
            sub_fees = sum(t["fee_btc"] for t in sub_txs)
            time_series.append({
                "segment": f"Seg {s+1}",
                "tx_count": len(sub_txs),
                "volume_btc": round(sub_vol, 4),
                "fees_btc": round(sub_fees, 6)
            })

        in_out_totals = {
            "total_in_btc": round(sum(addr_incoming_sats.values()) / SATOSHIS_PER_BTC, 8),
            "total_out_btc": round(sum(addr_outgoing_sats.values()) / SATOSHIS_PER_BTC, 8),
            "unique_addresses": len(all_addresses),
            "total_inputs": total_inputs,
            "total_outputs": total_outputs
        }

        analysis_end = time.perf_counter()
        analysis_time_sec = round(analysis_end - analysis_start, 4)
        total_time_sec = round(fetch_time_sec + analysis_time_sec, 4)

        return {
            "block_summary": {
                "hash": block_hash,
                "height": block_height,
                "timestamp": block_timestamp,
                "tx_count": total_tx_count,
                "analyzed_tx_count": analyzed_tx_count,
                "coverage_pct": coverage_pct,
                "total_volume_btc": total_volume_btc,
                "total_fees_btc": total_fees_btc,
                "largest_tx_btc": largest_tx_btc,
                "smallest_tx_btc": smallest_tx_btc,
                "avg_tx_btc": avg_tx_btc,
                "input_count": total_inputs,
                "output_count": total_outputs,
                "fetch_time_sec": round(fetch_time_sec, 4),
                "analysis_time_sec": analysis_time_sec,
                "total_time_sec": total_time_sec,
                "status": "analyzed"
            },
            "parsed_transactions": parsed_transactions,
            "parsed_inputs": parsed_inputs,
            "parsed_outputs": parsed_outputs,
            "parsed_activities": parsed_activities,
            "top_addresses": top_addresses,
            "volume_distribution": volume_distribution,
            "time_series": time_series,
            "in_out_totals": in_out_totals,
            "address_map": {a["address"]: a for a in ranked_addresses}
        }

    @staticmethod
    def detect_and_process_followed_addresses(
        block_hash: str,
        block_height: int,
        timestamp: int,
        address_map: Dict[str, Dict[str, Any]],
        conn
    ) -> List[Dict[str, Any]]:
        """
        Cross-references addresses seen in this block with followed addresses.
        Generates follow-up events and updates followed address tracking metrics.
        """
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM followed_addresses")
        followed_rows = cursor.fetchall()
        if not followed_rows:
            return []

        followed_events = []

        for row in followed_rows:
            f_addr = row["address"]
            if f_addr in address_map:
                obs = address_map[f_addr]
                curr_txs = obs["tx_count"]
                curr_in = obs["total_in_btc"]
                curr_out = obs["total_out_btc"]

                prev_total_txs = row["total_tx_count"]
                prev_in = row["total_in_btc"]
                prev_out = row["total_out_btc"]

                # Calculate activity change percentage compared to prior observed period
                if prev_total_txs > 0:
                    pct_change = round(((curr_txs - prev_total_txs) / prev_total_txs) * 100.0, 1)
                else:
                    pct_change = 100.0

                new_total_txs = prev_total_txs + curr_txs
                new_total_in = round(prev_in + curr_in, 8)
                new_total_out = round(prev_out + curr_out, 8)

                # Record follow_up_event
                cursor.execute("""
                INSERT INTO follow_up_events 
                (address, block_hash, block_height, timestamp, tx_count, incoming_btc, outgoing_btc, prev_tx_count, activity_change_pct, event_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    f_addr, block_hash, block_height, timestamp,
                    curr_txs, curr_in, curr_out, prev_total_txs, pct_change, "block_appearance"
                ))

                # Update followed_addresses summary
                cursor.execute("""
                UPDATE followed_addresses
                SET last_seen_height = ?,
                    last_seen_timestamp = ?,
                    total_tx_count = ?,
                    total_in_btc = ?,
                    total_out_btc = ?
                WHERE address = ?
                """, (block_height, timestamp, new_total_txs, new_total_in, new_total_out, f_addr))

                followed_events.append({
                    "address": f_addr,
                    "block_height": block_height,
                    "timestamp": timestamp,
                    "tx_count": curr_txs,
                    "incoming_btc": curr_in,
                    "outgoing_btc": curr_out,
                    "activity_change_pct": pct_change
                })

        return followed_events
