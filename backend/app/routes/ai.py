from fastapi import APIRouter, HTTPException
from app.database import query_one
from app.services.ai_service import ai_service
from app.validation import is_valid_bitcoin_address

router = APIRouter(prefix="/api/ai", tags=["ai"])

@router.get("/block/{height_or_hash}")
async def get_block_ai_summary(height_or_hash: str):
    if height_or_hash.isdigit():
        block = query_one("SELECT * FROM blocks WHERE height = ?", (int(height_or_hash),))
    else:
        block = query_one("SELECT * FROM blocks WHERE hash = ?", (height_or_hash,))

    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    res = await ai_service.summarize_block(block)
    return res

@router.get("/address/{address}")
async def get_address_ai_summary(address: str):
    if not is_valid_bitcoin_address(address):
        raise HTTPException(status_code=400, detail="Invalid Bitcoin address format")
    addr_info = query_one("SELECT * FROM followed_addresses WHERE address = ?", (address,))
    if not addr_info:
        stats = query_one("""
        SELECT 
            COUNT(DISTINCT txid) as total_tx_count,
            MIN(block_height) as first_seen_height,
            MAX(block_height) as last_seen_height,
            SUM(CASE WHEN direction = 'IN' THEN amount_btc ELSE 0 END) as total_in_btc,
            SUM(CASE WHEN direction = 'OUT' THEN amount_btc ELSE 0 END) as total_out_btc
        FROM address_activity
        WHERE address = ?
        """, (address,))
        addr_info = {
            "address": address,
            "total_tx_count": stats["total_tx_count"] or 0,
            "total_in_btc": stats["total_in_btc"] or 0.0,
            "total_out_btc": stats["total_out_btc"] or 0.0,
            "first_seen_height": stats["first_seen_height"],
            "last_seen_height": stats["last_seen_height"]
        }

    res = await ai_service.summarize_address(addr_info)
    return res
