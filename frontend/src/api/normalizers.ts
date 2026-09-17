import { AddressDetailData, AISummary, BlockAnalysisData, BlockSummary, FollowUpEventItem, FollowedAddressItem, HealthStatus, PatternPoint, RankedAddress, TransactionItem } from '../types';

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : null;
};

const numberOr = (value: unknown, fallback = 0): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

const stringOr = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;

export const normalizeTransaction = (value: unknown): TransactionItem | null => {
  const raw = asRecord(value);
  if (!raw || !stringOr(raw.txid)) return null;
  return { txid: stringOr(raw.txid), block_hash: stringOr(raw.block_hash), block_height: numberOr(raw.block_height), timestamp: numberOr(raw.timestamp), amount_btc: numberOr(raw.amount_btc), fee_btc: numberOr(raw.fee_btc), input_count: numberOr(raw.input_count), output_count: numberOr(raw.output_count), is_coinbase: numberOr(raw.is_coinbase) };
};

export const normalizeRankedAddress = (value: unknown): RankedAddress | null => {
  const raw = asRecord(value);
  if (!raw || !stringOr(raw.address)) return null;
  return { address: stringOr(raw.address), tx_count: numberOr(raw.tx_count), total_in_btc: numberOr(raw.total_in_btc), total_out_btc: numberOr(raw.total_out_btc), net_flow_btc: numberOr(raw.net_flow_btc), total_activity_btc: numberOr(raw.total_activity_btc), is_followed: raw.is_followed === true };
};

export const normalizeFollowedAddress = (value: unknown): FollowedAddressItem | null => {
  const raw = asRecord(value);
  if (!raw || !stringOr(raw.address)) return null;
  return { address: stringOr(raw.address), first_seen_height: numberOr(raw.first_seen_height), first_seen_timestamp: numberOr(raw.first_seen_timestamp), last_seen_height: numberOr(raw.last_seen_height), last_seen_timestamp: numberOr(raw.last_seen_timestamp), total_tx_count: numberOr(raw.total_tx_count), total_in_btc: numberOr(raw.total_in_btc), total_out_btc: numberOr(raw.total_out_btc), notes: stringOr(raw.notes), created_at: stringOr(raw.created_at) || undefined, latest_activity_change_pct: numberOr(raw.latest_activity_change_pct), detection_events_count: numberOr(raw.detection_events_count) };
};

export const normalizeFollowUpEvent = (value: unknown): FollowUpEventItem | null => {
  const raw = asRecord(value);
  if (!raw || typeof raw.id !== 'number' || !stringOr(raw.address)) return null;
  return { id: numberOr(raw.id), address: stringOr(raw.address), block_hash: stringOr(raw.block_hash), block_height: numberOr(raw.block_height), timestamp: numberOr(raw.timestamp), tx_count: numberOr(raw.tx_count), incoming_btc: numberOr(raw.incoming_btc), outgoing_btc: numberOr(raw.outgoing_btc), prev_tx_count: numberOr(raw.prev_tx_count), activity_change_pct: numberOr(raw.activity_change_pct), event_type: stringOr(raw.event_type), created_at: stringOr(raw.created_at) || undefined };
};

export const normalizePatternPoint = (value: unknown): PatternPoint | null => {
  const raw = asRecord(value);
  if (!raw) return null;
  return { block_height: numberOr(raw.block_height), timestamp: numberOr(raw.timestamp), transactions: numberOr(raw.transactions), in_btc: numberOr(raw.in_btc), out_btc: numberOr(raw.out_btc), volume_btc: numberOr(raw.volume_btc), cumulative_transactions: numberOr(raw.cumulative_transactions), cumulative_volume_btc: numberOr(raw.cumulative_volume_btc) };
};

export const normalizeAISummary = (value: unknown): AISummary => {
  const raw = asRecord(value) ?? {};
  return { status: raw.status === 'ok' ? 'ok' : 'unavailable', provider: stringOr(raw.provider, 'groq'), model: stringOr(raw.model) || undefined, summary: stringOr(raw.summary) || undefined, message: stringOr(raw.message) || undefined, structured_payload: asRecord(raw.structured_payload) ?? {} };
};

export const normalizeAddressDetail = (value: unknown): AddressDetailData | null => {
  const raw = asRecord(value);
  if (!raw || !stringOr(raw.address)) return null;
  const observed_blocks = Array.isArray(raw.observed_blocks) ? raw.observed_blocks.map((entry) => { const item = asRecord(entry); return item ? { height: numberOr(item.height), hash: stringOr(item.hash), timestamp: numberOr(item.timestamp), tx_count: numberOr(item.tx_count), block_in_btc: numberOr(item.block_in_btc), block_out_btc: numberOr(item.block_out_btc) } : null; }).filter((entry): entry is NonNullable<typeof entry> => entry !== null) : [];
  const recent_transactions = Array.isArray(raw.recent_transactions) ? raw.recent_transactions.map((entry) => { const item = asRecord(entry); return item ? { txid: stringOr(item.txid), block_height: numberOr(item.block_height), timestamp: numberOr(item.timestamp), direction: item.direction === 'OUT' ? 'OUT' as const : 'IN' as const, amount_btc: numberOr(item.amount_btc), fee_btc: numberOr(item.fee_btc), input_count: numberOr(item.input_count), output_count: numberOr(item.output_count) } : null; }).filter((entry): entry is NonNullable<typeof entry> => entry !== null) : [];
  return { address: stringOr(raw.address), is_followed: raw.is_followed === true, followed_record: normalizeFollowedAddress(raw.followed_record), first_seen_height: typeof raw.first_seen_height === 'number' ? raw.first_seen_height : undefined, first_seen_timestamp: typeof raw.first_seen_timestamp === 'number' ? raw.first_seen_timestamp : undefined, last_seen_height: typeof raw.last_seen_height === 'number' ? raw.last_seen_height : undefined, last_seen_timestamp: typeof raw.last_seen_timestamp === 'number' ? raw.last_seen_timestamp : undefined, total_tx_count: numberOr(raw.total_tx_count), total_in_btc: numberOr(raw.total_in_btc), total_out_btc: numberOr(raw.total_out_btc), net_flow_btc: numberOr(raw.net_flow_btc), observed_blocks, recent_transactions };
};

export const normalizeBlockSummary = (value: unknown): BlockSummary | null => {
  const raw = asRecord(value);
  if (!raw || typeof raw.hash !== 'string' || !raw.hash || typeof raw.height !== 'number') return null;

  return {
    hash: raw.hash,
    height: numberOr(raw.height),
    timestamp: numberOr(raw.timestamp),
    tx_count: numberOr(raw.tx_count),
    analyzed_tx_count: numberOr(raw.analyzed_tx_count),
    coverage_pct: numberOr(raw.coverage_pct),
    total_volume_btc: numberOr(raw.total_volume_btc),
    total_fees_btc: numberOr(raw.total_fees_btc),
    largest_tx_btc: numberOr(raw.largest_tx_btc),
    smallest_tx_btc: numberOr(raw.smallest_tx_btc),
    avg_tx_btc: numberOr(raw.avg_tx_btc),
    input_count: numberOr(raw.input_count),
    output_count: numberOr(raw.output_count),
    fetch_time_sec: numberOr(raw.fetch_time_sec),
    analysis_time_sec: numberOr(raw.analysis_time_sec),
    total_time_sec: numberOr(raw.total_time_sec),
    status: typeof raw.status === 'string' ? raw.status : 'unknown',
    created_at: typeof raw.created_at === 'string' ? raw.created_at : undefined,
  };
};

export const normalizeHealthStatus = (value: unknown): HealthStatus => {
  const raw = asRecord(value) ?? {};
  const database = asRecord(raw.database) ?? {};
  const aiService = asRecord(raw.ai_service) ?? {};

  return {
    status: typeof raw.status === 'string' ? raw.status : 'unknown',
    data_provider: typeof raw.data_provider === 'string' ? raw.data_provider : 'unknown',
    max_transactions_per_block: numberOr(raw.max_transactions_per_block),
    poll_interval_seconds: numberOr(raw.poll_interval_seconds),
    rolling_window_days: numberOr(raw.rolling_window_days),
    database: {
      latest_block: normalizeBlockSummary(database.latest_block),
      total_blocks_ingested: numberOr(database.total_blocks_ingested),
      total_transactions_indexed: numberOr(database.total_transactions_indexed),
      followed_addresses_count: numberOr(database.followed_addresses_count),
      follow_up_events_count: numberOr(database.follow_up_events_count),
    },
    ai_service: {
      provider: typeof aiService.provider === 'string' ? aiService.provider : 'unknown',
      is_configured: aiService.is_configured === true,
    },
  };
};

export const normalizeBlockAnalysis = (value: unknown): BlockAnalysisData | null => {
  const raw = asRecord(value);
  const block = normalizeBlockSummary(raw?.block);
  if (!raw || !block) return null;

  const inOutTotals = asRecord(raw.in_out_totals) ?? {};
  return {
    block,
    top_addresses: Array.isArray(raw.top_addresses) ? raw.top_addresses.map(normalizeRankedAddress).filter((item): item is RankedAddress => item !== null) : [],
    volume_distribution: Array.isArray(raw.volume_distribution) ? raw.volume_distribution : [],
    time_series: Array.isArray(raw.time_series) ? raw.time_series : [],
    in_out_totals: {
      total_in_btc: numberOr(inOutTotals.total_in_btc),
      total_out_btc: numberOr(inOutTotals.total_out_btc),
      unique_addresses: numberOr(inOutTotals.unique_addresses),
      total_inputs: numberOr(inOutTotals.total_inputs),
      total_outputs: numberOr(inOutTotals.total_outputs),
    },
  };
};