import re
from fastapi import APIRouter, HTTPException, Query
from app.database import query_one
from app.providers.mempool_provider import data_provider
from app.validation import is_valid_bitcoin_address

router = APIRouter(prefix="/api/search", tags=["search"])

@router.get("")
async def search_blockchain(q: str = Query(..., min_length=1)):
    query_str = q.strip()
    
    # 1. Check if integer -> Block Height
    if query_str.isdigit():
        height = int(query_str)
        # Check DB
        block = query_one("SELECT height, hash FROM blocks WHERE height = ?", (height,))
        if block:
            return {"type": "block", "id": str(block["height"]), "hash": block["hash"]}
        # Verify valid height range
        return {"type": "block", "id": str(height), "hash": None}

    # 2. Check if 64 hex characters -> Block Hash or TXID
    if re.fullmatch(r"^[0-9a-fA-F]{64}$", query_str):
        # Is it a block hash?
        block = query_one("SELECT height, hash FROM blocks WHERE hash = ?", (query_str,))
        if block:
            return {"type": "block", "id": str(block["height"]), "hash": block["hash"]}

        # Is it a transaction in our DB?
        tx = query_one("SELECT txid, block_height FROM transactions WHERE txid = ?", (query_str,))
        if tx:
            return {"type": "transaction", "id": tx["txid"], "block_height": tx["block_height"]}

        # Check if block hash starting with zeros
        if query_str.startswith("00000000"):
            return {"type": "block", "id": query_str, "hash": query_str}

        return {"type": "transaction", "id": query_str}

    # 3. Check if Bitcoin Address (Base58 or Bech32)
    # 1..., 3..., bc1...
    if query_str.startswith(("1", "3", "bc1", "tb1")):
        if not is_valid_bitcoin_address(query_str):
            raise HTTPException(status_code=400, detail="Invalid Bitcoin address format")
        return {"type": "address", "id": query_str}

    # Fallback search in our transactions or addresses
    addr_match = query_one("SELECT address FROM address_activity WHERE address LIKE ? LIMIT 1", (f"%{query_str}%",))
    if addr_match:
        return {"type": "address", "id": addr_match["address"]}

    raise HTTPException(status_code=404, detail="No matching block, transaction, or address found.")
