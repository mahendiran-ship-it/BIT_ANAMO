import asyncio
import json
import logging
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from app.services.event_service import event_broadcaster

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/events", tags=["events"])

@router.get("")
async def sse_events(request: Request):
    """
    Server-Sent Events endpoint streaming real-time block detections,
    analysis completions, and followed address activity detections.
    """
    queue = await event_broadcaster.subscribe()

    async def event_generator():
        try:
            # Yield initial connection confirmation
            yield f"event: ping\ndata: {json.dumps({'status': 'connected'})}\n\n"
            
            while True:
                # Disconnect check
                if await request.is_disconnected():
                    break

                try:
                    # Wait for next event or send heartbeat ping every 15 seconds
                    msg = await asyncio.wait_for(queue.get(), timeout=15.0)
                    event_type = msg.get("type", "message")
                    data_str = json.dumps(msg.get("data", {}))
                    yield f"event: {event_type}\ndata: {data_str}\n\n"
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat ping
                    yield f": keepalive\n\n"

        except asyncio.CancelledError:
            pass
        finally:
            await event_broadcaster.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
