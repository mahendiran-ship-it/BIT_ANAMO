import json
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from app.database import query_one, query_all
from app.services.ingestion_service import ingestion_service
from app.services.follow_service import follow_service
from app.providers.base import DataProviderUnavailableException

router = APIRouter(prefix="/api/blocks", tags=["blocks"])

@router.get("/latest")
async def get_latest_block():
    block = query_one("SELECT * FROM blocks ORDER BY height DESC LIMIT 1")
    if not block:
        raise HTTPException(status_code=404, detail="No blocks ingested yet. Ingestion in progress.")
    return block

@router.get("")
async def list_blocks(
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    window_days: Optional[int] = Query(10, ge=1, le=365)
):
    """List blocks within the 10-day rolling window, newest first."""
    # 10 days = 10 * 24 * 3600 = 864,000 seconds
    where_clause = ""
    params = []
    if window_days and window_days > 0:
        cutoff = window_days * 86400
        # If DB timestamp is within 10 days of latest block or current time
        where_clause = "WHERE timestamp >= (strftime('%s', 'now') - ?)"
        params.append(cutoff)

    # Let's count total
    total_count = query_one(f"SELECT COUNT(*) as cnt FROM blocks {where_clause}", tuple(params))
    
    query = f"SELECT * FROM blocks {where_clause} ORDER BY height DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    blocks = query_all(query, tuple(params))

    return {
        "blocks": blocks,
        "total": total_count["cnt"] if total_count else len(blocks),
        "limit": limit,
        "offset": offset,
        "window_days": window_days
    }

@router.get("/{height_or_hash}")
async def get_block(height_or_hash: str):
    if height_or_hash.isdigit():
        block = query_one("SELECT * FROM blocks WHERE height = ?", (int(height_or_hash),))
    else:
        block = query_one("SELECT * FROM blocks WHERE hash = ?", (height_or_hash,))

    if not block:
        # Try on-demand ingestion if height is requested
        if height_or_hash.isdigit():
            try:
                ingested = await ingestion_service.ingest_block_by_height(int(height_or_hash))
            except DataProviderUnavailableException as exc:
                raise HTTPException(status_code=503, detail="Bitcoin data provider is unavailable") from exc
            if ingested:
                return ingested
        raise HTTPException(status_code=404, detail=f"Block {height_or_hash} not found")
    return block

@router.get("/{height_or_hash}/analysis")
async def get_block_analysis(height_or_hash: str):
    if height_or_hash.isdigit():
        block = query_one("SELECT * FROM blocks WHERE height = ?", (int(height_or_hash),))
    else:
        block = query_one("SELECT * FROM blocks WHERE hash = ?", (height_or_hash,))

    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    stats = query_one("SELECT * FROM block_statistics WHERE block_hash = ?", (block["hash"],))
    
    top_addresses = json.loads(stats["top_addresses_json"]) if stats else []
    # Enhance top addresses with is_followed status
    for addr in top_addresses:
        addr["is_followed"] = follow_service.is_followed(addr["address"])

    return {
        "block": block,
        "top_addresses": top_addresses,
        "volume_distribution": json.loads(stats["volume_distribution_json"]) if stats else [],
        "time_series": json.loads(stats["time_series_json"]) if stats else [],
        "in_out_totals": json.loads(stats["in_out_totals_json"]) if stats else {}
    }

@router.get("/{height_or_hash}/transactions")
async def get_block_transactions(
    height_or_hash: str,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: Optional[str] = None,
    sort_by: str = Query("amount_btc"), # amount_btc, fee_btc, input_count, output_count
    order: str = Query("desc")
):
    if height_or_hash.isdigit():
        block = query_one("SELECT hash FROM blocks WHERE height = ?", (int(height_or_hash),))
    else:
        block = query_one("SELECT hash FROM blocks WHERE hash = ?", (height_or_hash,))

    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    block_hash = block["hash"]
    allowed_sorts = {"amount_btc", "fee_btc", "input_count", "output_count", "is_coinbase"}
    sort_column = sort_by if sort_by in allowed_sorts else "amount_btc"
    sort_direction = "ASC" if order.lower() == "asc" else "DESC"

    where_clauses = ["block_hash = ?"]
    params = [block_hash]

    if search:
        where_clauses.append("txid LIKE ?")
        params.append(f"%{search}%")

    where_str = " AND ".join(where_clauses)
    total = query_one(f"SELECT COUNT(*) as cnt FROM transactions WHERE {where_str}", tuple(params))
    
    query = f"SELECT * FROM transactions WHERE {where_str} ORDER BY {sort_column} {sort_direction} LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    txs = query_all(query, tuple(params))

    return {
        "transactions": txs,
        "total": total["cnt"] if total else len(txs),
        "limit": limit,
        "offset": offset
    }

@router.get("/{height_or_hash}/addresses")
async def get_block_addresses(height_or_hash: str):
    if height_or_hash.isdigit():
        block = query_one("SELECT hash FROM blocks WHERE height = ?", (int(height_or_hash),))
    else:
        block = query_one("SELECT hash FROM blocks WHERE hash = ?", (height_or_hash,))

    if not block:
        raise HTTPException(status_code=404, detail="Block not found")

    stats = query_one("SELECT top_addresses_json FROM block_statistics WHERE block_hash = ?", (block["hash"],))
    top_addresses = json.loads(stats["top_addresses_json"]) if stats else []
    for a in top_addresses:
        a["is_followed"] = follow_service.is_followed(a["address"])

    return {"addresses": top_addresses}

@router.post("/{height_or_hash}/reanalyze")
async def reanalyze_block(height_or_hash: str):
    """Trigger on-demand re-analysis of a block."""
    if height_or_hash.isdigit():
        height = int(height_or_hash)
    else:
        block = query_one("SELECT height FROM blocks WHERE hash = ?", (height_or_hash,))
        if not block:
            raise HTTPException(status_code=404, detail="Block not found")
        height = block["height"]

    # Re-ingest
    try:
        res = await ingestion_service.ingest_block_by_height(height, force_reanalyze=True)
    except DataProviderUnavailableException as exc:
        raise HTTPException(status_code=503, detail="Bitcoin data provider is unavailable") from exc
    if not res:
        raise HTTPException(status_code=500, detail="Failed to re-analyze block")
    return {"message": f"Block #{height} re-analyzed successfully", "block": res}
