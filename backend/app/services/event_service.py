import asyncio
import json
import logging
from typing import Set, Dict, Any

logger = logging.getLogger(__name__)

class EventBroadcaster:
    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        async with self._lock:
            self._subscribers.add(q)
        logger.info(f"New SSE client connected. Total active: {len(self._subscribers)}")
        return q

    async def unsubscribe(self, q: asyncio.Queue):
        async with self._lock:
            self._subscribers.discard(q)
        logger.info(f"SSE client disconnected. Total active: {len(self._subscribers)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        """Broadcast event to all connected clients."""
        payload = {
            "type": event_type,
            "data": data
        }
        async with self._lock:
            subs = list(self._subscribers)
        for q in subs:
            try:
                q.put_nowait(payload)
            except Exception as e:
                logger.error(f"Error queueing event for client: {e}")

event_broadcaster = EventBroadcaster()
