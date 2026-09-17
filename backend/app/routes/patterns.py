from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.database import query_all
from app.validation import is_valid_bitcoin_address

router = APIRouter(prefix="/api/patterns", tags=["patterns"])

@router.get("/{address}")
async def get_address_patterns(address: str):
    """
    Returns chronological block-by-block activity patterns for an address.
    """
    if not is_valid_bitcoin_address(address):
        raise HTTPException(status_code=400, detail="Invalid Bitcoin address format")

    rows = query_all("""
    SELECT 
        b.height as block_height,
        b.timestamp,
        COUNT(a.txid) as transaction_count,
        SUM(CASE WHEN a.direction = 'IN' THEN a.amount_btc ELSE 0 END) as in_btc,
        SUM(CASE WHEN a.direction = 'OUT' THEN a.amount_btc ELSE 0 END) as out_btc,
        SUM(a.amount_btc) as volume_btc,
        COUNT(DISTINCT a.txid) as unique_txs
    FROM address_activity a
    JOIN blocks b ON a.block_hash = b.hash
    WHERE a.address = ?
    GROUP BY b.height, b.timestamp
    ORDER BY b.height ASC
    """, (address,))

    if not rows:
        raise HTTPException(status_code=404, detail="No activity pattern found for this address in analyzed blocks.")

    # Calculate cumulative metrics
    cum_txs = 0
    cum_vol = 0.0
    pattern_data = []

    for r in rows:
        cum_txs += r["transaction_count"]
        cum_vol = round(cum_vol + r["volume_btc"], 8)
        pattern_data.append({
            "block_height": r["block_height"],
            "timestamp": r["timestamp"],
            "transactions": r["transaction_count"],
            "in_btc": round(r["in_btc"], 8),
            "out_btc": round(r["out_btc"], 8),
            "volume_btc": round(r["volume_btc"], 8),
            "cumulative_transactions": cum_txs,
            "cumulative_volume_btc": cum_vol
        })

    return {
        "address": address,
        "points_count": len(pattern_data),
        "patterns": pattern_data
    }
