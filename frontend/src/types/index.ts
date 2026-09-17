export interface BlockSummary {
  hash: string;
  height: number;
  timestamp: number;
  tx_count: number;
  analyzed_tx_count: number;
  coverage_pct: number;
  total_volume_btc: number;
  total_fees_btc: number;
  largest_tx_btc: number;
  smallest_tx_btc: number;
  avg_tx_btc: number;
  input_count: number;
  output_count: number;
  fetch_time_sec: number;
  analysis_time_sec: number;
  total_time_sec: number;
  status: string;
  created_at?: string;
}

export interface TransactionItem {
  txid: string;
  block_hash: string;
  block_height: number;
  timestamp: number;
  amount_btc: number;
  fee_btc: number;
  input_count: number;
  output_count: number;
  is_coinbase: number;
}

export interface RankedAddress {
  address: string;
  tx_count: number;
  total_in_btc: number;
  total_out_btc: number;
  net_flow_btc: number;
  total_activity_btc: number;
  is_followed?: boolean;
}

export interface VolumeDistributionItem {
  range: string;
  count: number;
}

export interface TimeSeriesItem {
  segment: string;
  tx_count: number;
  volume_btc: number;
  fees_btc: number;
}

export interface InOutTotals {
  total_in_btc: number;
  total_out_btc: number;
  unique_addresses: number;
  total_inputs: number;
  total_outputs: number;
}

export interface BlockAnalysisData {
  block: BlockSummary;
  top_addresses: RankedAddress[];
  volume_distribution: VolumeDistributionItem[];
  time_series: TimeSeriesItem[];
  in_out_totals: InOutTotals;
}

export interface FollowedAddressItem {
  address: string;
  first_seen_height: number;
  first_seen_timestamp: number;
  last_seen_height: number;
  last_seen_timestamp: number;
  total_tx_count: number;
  total_in_btc: number;
  total_out_btc: number;
  notes?: string;
  created_at?: string;
  latest_activity_change_pct: number;
  detection_events_count?: number;
}

export interface FollowUpEventItem {
  id: number;
  address: string;
  block_hash: string;
  block_height: number;
  timestamp: number;
  tx_count: number;
  incoming_btc: number;
  outgoing_btc: number;
  prev_tx_count: number;
  activity_change_pct: number;
  event_type: string;
  created_at?: string;
}

export interface AddressDetailData {
  address: string;
  is_followed: boolean;
  followed_record?: FollowedAddressItem | null;
  first_seen_height?: number;
  first_seen_timestamp?: number;
  last_seen_height?: number;
  last_seen_timestamp?: number;
  total_tx_count: number;
  total_in_btc: number;
  total_out_btc: number;
  net_flow_btc: number;
  observed_blocks: Array<{
    height: number;
    hash: string;
    timestamp: number;
    tx_count: number;
    block_in_btc: number;
    block_out_btc: number;
  }>;
  recent_transactions: Array<{
    txid: string;
    block_height: number;
    timestamp: number;
    direction: 'IN' | 'OUT';
    amount_btc: number;
    fee_btc: number;
    input_count: number;
    output_count: number;
  }>;
}

export interface HealthStatus {
  status: string;
  data_provider: string;
  max_transactions_per_block: number;
  poll_interval_seconds: number;
  rolling_window_days: number;
  database: {
    latest_block?: BlockSummary | null;
    total_blocks_ingested: number;
    total_transactions_indexed: number;
    followed_addresses_count: number;
    follow_up_events_count: number;
  };
  ai_service: {
    provider: string;
    is_configured: boolean;
  };
}

export interface RealtimeNotification {
  id: string;
  type: 'info' | 'success' | 'alert' | 'block';
  title: string;
  message: string;
  timestamp: number;
  link?: string;
}

export interface AISummary {
  status: 'ok' | 'unavailable';
  provider: string;
  model?: string;
  summary?: string;
  message?: string;
  structured_payload: Record<string, unknown>;
}

export interface PatternPoint {
  block_height: number;
  timestamp: number;
  transactions: number;
  in_btc: number;
  out_btc: number;
  volume_btc: number;
  cumulative_transactions: number;
  cumulative_volume_btc: number;
}
