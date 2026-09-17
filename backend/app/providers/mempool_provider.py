import httpx
import asyncio
import logging
from typing import List, Dict, Any, Optional
from app.config import settings
from app.providers.base import BitcoinDataProvider, DataProviderUnavailableException

logger = logging.getLogger(__name__)

class MempoolDataProvider(BitcoinDataProvider):
    def __init__(self):
        self.base_url = settings.BITCOIN_API_BASE.rstrip("/")
        self.headers = {
            "User-Agent": "BitcoinIntelPlatform/1.0",
            "Accept": "application/json"
        }
        if settings.BITCOIN_API_KEY:
            self.headers["Authorization"] = f"Bearer {settings.BITCOIN_API_KEY}"
        
        # Configure client with limits and timeouts
        self.timeout = httpx.Timeout(15.0, connect=10.0)
        self.limits = httpx.Limits(max_keepalive_connections=20, max_connections=40)

    async def _get(self, endpoint: str) -> Any:
        url = f"{self.base_url}{endpoint}"
        max_retries = 3
        delay = 1.0
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout, limits=self.limits, headers=self.headers) as client:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        content_type = resp.headers.get("content-type", "")
                        if "application/json" in content_type:
                            return resp.json()
                        return resp.text.strip()
                    elif resp.status_code == 404:
                        return None
                    elif resp.status_code == 429:
                        logger.warning(f"Rate limited (429) on {url}, retrying in {delay}s...")
                        await asyncio.sleep(delay)
                        delay *= 2
                        continue
                    else:
                        logger.warning(f"Error {resp.status_code} fetching {url}: {resp.text[:100]}")
                        await asyncio.sleep(delay)
                        delay *= 2
            except httpx.RequestError as exc:
                logger.warning(f"Network error on {url} (attempt {attempt+1}/{max_retries}): {exc}")
                if attempt == max_retries - 1:
                    raise DataProviderUnavailableException(f"Failed to reach Bitcoin data provider at {url}: {exc}")
                await asyncio.sleep(delay)
                delay *= 1.5

        raise DataProviderUnavailableException(f"Failed to fetch data from provider endpoint {endpoint} after {max_retries} attempts.")

    async def get_tip_height(self) -> int:
        res = await self._get("/blocks/tip/height")
        try:
            return int(res)
        except (ValueError, TypeError):
            raise DataProviderUnavailableException(f"Invalid tip height returned: {res}")

    async def get_block_hash_by_height(self, height: int) -> str:
        block_hash = await self._get(f"/block-height/{height}")
        if not block_hash:
            raise DataProviderUnavailableException(f"Block at height {height} not found.")
        return str(block_hash).strip()

    async def get_block_metadata(self, height_or_hash: str | int) -> Dict[str, Any]:
        if isinstance(height_or_hash, int) or str(height_or_hash).isdigit():
            block_hash = await self.get_block_hash_by_height(int(height_or_hash))
        else:
            block_hash = str(height_or_hash).strip()
        
        meta = await self._get(f"/block/{block_hash}")
        if not meta or not isinstance(meta, dict):
            raise DataProviderUnavailableException(f"Block metadata unavailable for hash {block_hash}")
        return meta

    async def get_recent_blocks(self, limit: int = 15) -> List[Dict[str, Any]]:
        blocks = await self._get("/v1/blocks")
        if not blocks or not isinstance(blocks, list):
            raise DataProviderUnavailableException("Recent blocks list unavailable from provider.")
        return blocks[:limit]

    async def get_block_transactions(self, block_hash: str, limit: int = 1000) -> List[Dict[str, Any]]:
        """
        Fetch up to `limit` transactions for a block.
        Mempool returns 25 transactions per page: /api/block/:hash/txs/:start_index.
        We batch fetch concurrently with concurrency throttling.
        """
        PAGE_SIZE = 25
        max_pages = (limit + PAGE_SIZE - 1) // PAGE_SIZE
        all_txs: List[Dict[str, Any]] = []

        semaphore = asyncio.Semaphore(12) # Up to 12 concurrent requests

        async def fetch_page(start_idx: int) -> Optional[List[Dict[str, Any]]]:
            async with semaphore:
                endpoint = f"/block/{block_hash}/txs" if start_idx == 0 else f"/block/{block_hash}/txs/{start_idx}"
                try:
                    res = await self._get(endpoint)
                    return res if isinstance(res, list) else []
                except Exception:
                    logger.exception("Transaction page fetch failed at index %s", start_idx)
                    raise

        # Fetch in batches of 10 pages at a time so we stop as soon as a page has < 25 txs
        BATCH_SIZE = 10
        for batch_start in range(0, max_pages, BATCH_SIZE):
            indices = [i * PAGE_SIZE for i in range(batch_start, min(batch_start + BATCH_SIZE, max_pages))]
            tasks = [fetch_page(idx) for idx in indices]
            results = await asyncio.gather(*tasks)
            
            end_reached = False
            for page in results:
                if page is None:
                    end_reached = True
                    break
                if not page:
                    end_reached = True
                    break
                all_txs.extend(page)
                if len(page) < PAGE_SIZE or len(all_txs) >= limit:
                    end_reached = True
                    break
            
            if end_reached:
                break

        return all_txs[:limit]

    async def get_address_info(self, address: str) -> Dict[str, Any]:
        info = await self._get(f"/address/{address}")
        if not info or not isinstance(info, dict):
            return {}
        return info

    async def get_transaction(self, txid: str) -> Dict[str, Any]:
        tx = await self._get(f"/tx/{txid}")
        if not tx or not isinstance(tx, dict):
            raise DataProviderUnavailableException(f"Transaction {txid} not found.")
        return tx

# Singleton instance
data_provider = MempoolDataProvider()
