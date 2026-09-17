from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class BlockSummary(BaseModel):
    hash: str
    height: int
    timestamp: int
    tx_count: int
    analyzed_tx_count: int
    coverage_pct: float
    total_volume_btc: float
    total_fees_btc: float
    largest_tx_btc: float
    smallest_tx_btc: float
    avg_tx_btc: float
    input_count: int
    output_count: int
    fetch_time_sec: float
    analysis_time_sec: float
    total_time_sec: float
    status: str = "analyzed"
    created_at: Optional[str] = None

class TransactionDetail(BaseModel):
    txid: str
    block_hash: str
    block_height: int
    timestamp: int
    amount_btc: float
    fee_btc: float
    input_count: int
    output_count: int
    is_coinbase: bool = False
    inputs: Optional[List[Dict[str, Any]]] = None
    outputs: Optional[List[Dict[str, Any]]] = None

class AddressActivitySummary(BaseModel):
    address: str
    tx_count: int
    total_in_btc: float
    total_out_btc: float
    net_flow_btc: float
    is_followed: bool = False
    first_seen_height: Optional[int] = None
    last_seen_height: Optional[int] = None

class FollowedAddress(BaseModel):
    address: str
    first_seen_height: int
    first_seen_timestamp: int
    last_seen_height: int
    last_seen_timestamp: int
    total_tx_count: int
    total_in_btc: float
    total_out_btc: float
    notes: Optional[str] = None
    created_at: Optional[str] = None
    latest_activity_change_pct: Optional[float] = 0.0

class FollowUpEvent(BaseModel):
    id: int
    address: str
    block_hash: str
    block_height: int
    timestamp: int
    tx_count: int
    incoming_btc: float
    outgoing_btc: float
    prev_tx_count: int
    activity_change_pct: float
    event_type: str = "block_appearance"
    created_at: Optional[str] = None

class BlockStatistics(BaseModel):
    block_hash: str
    top_addresses: List[Dict[str, Any]]
    volume_distribution: List[Dict[str, Any]]
    time_series: List[Dict[str, Any]]
    in_out_totals: Dict[str, Any]

class AISummaryPlaceholder(BaseModel):
    status: str = "AI integration coming soon"
    provider: str = "placeholder"
    message: str
    structured_payload: Dict[str, Any]
