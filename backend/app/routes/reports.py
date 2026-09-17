from fastapi import APIRouter, HTTPException, Query, Response
from app.services.report_service import report_service
from app.validation import is_valid_bitcoin_address

router = APIRouter(prefix="/api/reports", tags=["reports"])

@router.get("/block/{height_or_hash}")
async def get_block_report(height_or_hash: str, format: str = Query("json", pattern="^(json|csv|html)$")):
    try:
        content, media_type = report_service.generate_block_report(height_or_hash, fmt=format)
        filename = f"bitcoin_block_{height_or_hash}_report.{format}"
        headers = {
            "Content-Disposition": f"attachment; filename={filename}"
        }
        return Response(content=content, media_type=media_type, headers=headers)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {e}")

@router.get("/address/{address}")
async def get_address_report(address: str, format: str = Query("json", pattern="^(json|csv|html)$")):
    if not is_valid_bitcoin_address(address):
        raise HTTPException(status_code=400, detail="Invalid Bitcoin address format")
    try:
        content, media_type = report_service.generate_address_report(address, fmt=format)
        filename = f"bitcoin_address_{address[:10]}_report.{format}"
        headers = {
            "Content-Disposition": f"attachment; filename={filename}"
        }
        return Response(content=content, media_type=media_type, headers=headers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {e}")
