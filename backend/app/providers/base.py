from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class DataProviderUnavailableException(Exception):
    """Raised when Bitcoin blockchain data provider cannot be reached or returns an error."""
    pass

class BitcoinDataProvider(ABC):
    @abstractmethod
    async def get_tip_height(self) -> int:
        """Fetch latest block height."""
        pass

    @abstractmethod
    async def get_block_metadata(self, height_or_hash: str | int) -> Dict[str, Any]:
        """Fetch metadata for a given block height or hash."""
        pass

    @abstractmethod
    async def get_recent_blocks(self, limit: int = 15) -> List[Dict[str, Any]]:
        """Fetch list of recent blocks."""
        pass

    @abstractmethod
    async def get_block_transactions(self, block_hash: str, limit: int = 1000) -> List[Dict[str, Any]]:
        """Fetch up to limit transactions for a specific block."""
        pass

    @abstractmethod
    async def get_address_info(self, address: str) -> Dict[str, Any]:
        """Fetch address info if available."""
        pass

    @abstractmethod
    async def get_transaction(self, txid: str) -> Dict[str, Any]:
        """Fetch single transaction by txid."""
        pass
