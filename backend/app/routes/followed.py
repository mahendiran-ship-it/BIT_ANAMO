from fastapi import APIRouter, HTTPException, Query
from app.services.follow_service import follow_service
from app.validation import is_valid_bitcoin_address

router = APIRouter(prefix="/api/followed", tags=["followed"])

@router.get("")
async def get_all_followed():
    addresses = follow_service.get_followed_addresses()
    return {
        "followed_addresses": addresses,
        "count": len(addresses)
    }

@router.get("/activity")
async def get_followed_activity(limit: int = Query(50, ge=1, le=100)):
    events = follow_service.get_followed_events(limit=limit)
    return {
        "events": events,
        "count": len(events)
    }

@router.get("/{address}/compare")
async def compare_address(address: str):
    if not is_valid_bitcoin_address(address):
        raise HTTPException(status_code=400, detail="Invalid Bitcoin address format")
    comparison = follow_service.compare_address_activity(address)
    if "error" in comparison:
        raise HTTPException(status_code=404, detail=comparison["error"])
    return comparison
