from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, Dict, Any
from app.database import query_one, query_all
from app.services.follow_service import follow_service
from app.validation import is_valid_bitcoin_address

router = APIRouter(prefix="/api/address", tags=["addresses"])

@router.get("/{address}")
async def get_address_details(address: str):
    if not is_valid_bitcoin_address(address):
        raise HTTPException(status_code=400, detail="Invalid Bitcoin address format")
    # Query observed statistics from our database
    stats = query_one("""
    SELECT 
        COUNT(DISTINCT txid) as observed_tx_count,
        MIN(block_height) as first_seen_height,
        MIN(timestamp) as first_seen_ts,
        MAX(block_height) as last_seen_height,
        MAX(timestamp) as last_seen_ts,
        SUM(CASE WHEN direction = 'IN' THEN amount_btc ELSE 0 END) as total_in_btc,
        SUM(CASE WHEN direction = 'OUT' THEN amount_btc ELSE 0 END) as total_out_btc
    FROM address_activity
    WHERE address = ?
    """, (address,))

    is_followed = follow_service.is_followed(address)
    followed_record = query_one("SELECT * FROM followed_addresses WHERE address = ?", (address,))

    # Get observed blocks
    observed_blocks = query_all("""
    SELECT DISTINCT b.height, b.hash, b.timestamp, 
           COUNT(a.txid) as tx_count,
           SUM(CASE WHEN a.direction = 'IN' THEN a.amount_btc ELSE 0 END) as block_in_btc,
           SUM(CASE WHEN a.direction = 'OUT' THEN a.amount_btc ELSE 0 END) as block_out_btc
    FROM address_activity a
    JOIN blocks b ON a.block_hash = b.hash
    WHERE a.address = ?
    GROUP BY b.height, b.hash, b.timestamp
    ORDER BY b.height DESC
    LIMIT 20
    """, (address,))

    # Recent transactions
    recent_txs = query_all("""
    SELECT a.txid, a.block_height, a.timestamp, a.direction, a.amount_btc,
           t.fee_btc, t.input_count, t.output_count
    FROM address_activity a
    JOIN transactions t ON a.txid = t.txid
    WHERE a.address = ?
    ORDER BY a.block_height DESC, a.id DESC
    LIMIT 50
    """, (address,))

    total_in = round(stats["total_in_btc"] or 0.0, 8)
    total_out = round(stats["total_out_btc"] or 0.0, 8)
    net_flow = round(total_in - total_out, 8)

    return {
        "address": address,
        "is_followed": is_followed,
        "followed_record": followed_record,
        "first_seen_height": stats["first_seen_height"],
        "first_seen_timestamp": stats["first_seen_ts"],
        "last_seen_height": stats["last_seen_height"],
        "last_seen_timestamp": stats["last_seen_ts"],
        "total_tx_count": stats["observed_tx_count"] or 0,
        "total_in_btc": total_in,
        "total_out_btc": total_out,
        "net_flow_btc": net_flow,
        "observed_blocks": observed_blocks,
        "recent_transactions": recent_txs
    }

@router.post("/{address}/follow")
async def follow_address(address: str, body: Optional[Dict[str, Any]] = Body(None)):
    if not is_valid_bitcoin_address(address):
        raise HTTPException(status_code=400, detail="Invalid Bitcoin address format")
    notes = body.get("notes") if body else None
    result = follow_service.follow_address(address, notes=notes)
    return {
        "message": f"Address {address} is now followed",
        "followed": True,
        "record": result
    }

@router.delete("/{address}/follow")
async def unfollow_address(address: str):
    if not is_valid_bitcoin_address(address):
        raise HTTPException(status_code=400, detail="Invalid Bitcoin address format")
    success = follow_service.unfollow_address(address)
    return {
        "message": f"Address {address} unfollowed" if success else "Address was not followed",
        "followed": False,
        "success": success
    }
