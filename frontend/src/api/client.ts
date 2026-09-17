import {
  BlockSummary,
  BlockAnalysisData,
  FollowedAddressItem,
  FollowUpEventItem,
  AddressDetailData,
  HealthStatus,
  TransactionItem,
  AISummary,
  PatternPoint
} from '../types';
import { normalizeAddressDetail, normalizeAISummary, normalizeBlockAnalysis, normalizeBlockSummary, normalizeFollowedAddress, normalizeFollowUpEvent, normalizeHealthStatus, normalizePatternPoint, normalizeTransaction } from './normalizers';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

class ApiClient {
  private async fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options?.headers,
      }
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new Error(`API Error [${res.status}]: ${errText}`);
    }

    return res.json();
  }

  async getHealth(): Promise<HealthStatus> {
    return normalizeHealthStatus(await this.fetchJson<unknown>('/health'));
  }

  async getLatestBlock(): Promise<BlockSummary> {
    const block = normalizeBlockSummary(await this.fetchJson<unknown>('/blocks/latest'));
    if (!block) throw new Error('API returned an invalid latest block');
    return block;
  }

  async listBlocks(params?: { limit?: number; offset?: number; window_days?: number }): Promise<{
    blocks: BlockSummary[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.window_days) searchParams.set('window_days', params.window_days.toString());
    const response = await this.fetchJson<{ blocks?: unknown[]; total?: number; limit?: number; offset?: number }>(`/blocks?${searchParams.toString()}`);
    return {
      blocks: (response.blocks ?? []).map(normalizeBlockSummary).filter((block): block is BlockSummary => block !== null),
      total: typeof response.total === 'number' ? response.total : 0,
      limit: typeof response.limit === 'number' ? response.limit : params?.limit ?? 25,
      offset: typeof response.offset === 'number' ? response.offset : params?.offset ?? 0,
    };
  }

  async getBlock(heightOrHash: string | number): Promise<BlockSummary> {
    const block = normalizeBlockSummary(await this.fetchJson<unknown>(`/blocks/${heightOrHash}`));
    if (!block) throw new Error('API returned an invalid block');
    return block;
  }

  async getBlockAnalysis(heightOrHash: string | number): Promise<BlockAnalysisData> {
    const analysis = normalizeBlockAnalysis(await this.fetchJson<unknown>(`/blocks/${heightOrHash}/analysis`));
    if (!analysis) throw new Error('API returned invalid block analysis data');
    return analysis;
  }

  async getBlockTransactions(heightOrHash: string | number, params?: {
    limit?: number;
    offset?: number;
    search?: string;
    sort_by?: string;
    order?: string;
  }): Promise<{
    transactions: TransactionItem[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.offset) searchParams.set('offset', params.offset.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sort_by) searchParams.set('sort_by', params.sort_by);
    if (params?.order) searchParams.set('order', params.order);
    const response = await this.fetchJson<{ transactions?: unknown[]; total?: number; limit?: number; offset?: number }>(`/blocks/${heightOrHash}/transactions?${searchParams.toString()}`);
    return {
      transactions: (response.transactions ?? []).map(normalizeTransaction).filter((item): item is TransactionItem => item !== null),
      total: typeof response.total === 'number' ? response.total : 0,
      limit: typeof response.limit === 'number' ? response.limit : params?.limit ?? 50,
      offset: typeof response.offset === 'number' ? response.offset : params?.offset ?? 0,
    };
  }

  async reanalyzeBlock(heightOrHash: string | number): Promise<{ message: string; block: BlockSummary }> {
    return this.fetchJson(`/blocks/${heightOrHash}/reanalyze`, { method: 'POST' });
  }

  async getAddress(address: string): Promise<AddressDetailData> {
    const result = normalizeAddressDetail(await this.fetchJson<unknown>(`/address/${address}`));
    if (!result) throw new Error('API returned invalid address data');
    return result;
  }

  async followAddress(address: string, notes?: string): Promise<{ message: string; followed: boolean }> {
    return this.fetchJson(`/address/${address}/follow`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    });
  }

  async unfollowAddress(address: string): Promise<{ message: string; followed: boolean }> {
    return this.fetchJson(`/address/${address}/follow`, {
      method: 'DELETE'
    });
  }

  async getFollowed(): Promise<{ followed_addresses: FollowedAddressItem[]; count: number }> {
    const response = await this.fetchJson<{ followed_addresses?: unknown[]; count?: number }>('/followed');
    return { followed_addresses: (response.followed_addresses ?? []).map(normalizeFollowedAddress).filter((item): item is FollowedAddressItem => item !== null), count: typeof response.count === 'number' ? response.count : 0 };
  }

  async getFollowedActivity(limit: number = 50): Promise<{ events: FollowUpEventItem[]; count: number }> {
    const response = await this.fetchJson<{ events?: unknown[]; count?: number }>(`/followed/activity?limit=${limit}`);
    return { events: (response.events ?? []).map(normalizeFollowUpEvent).filter((item): item is FollowUpEventItem => item !== null), count: typeof response.count === 'number' ? response.count : 0 };
  }

  async compareAddress(address: string): Promise<any> {
    return this.fetchJson(`/followed/${address}/compare`);
  }

  async getPatterns(address: string): Promise<{ address: string; points_count: number; patterns: PatternPoint[] }> {
    const response = await this.fetchJson<{ address?: unknown; points_count?: unknown; patterns?: unknown[] }>(`/patterns/${address}`);
    return { address: typeof response.address === 'string' ? response.address : address, points_count: typeof response.points_count === 'number' ? response.points_count : 0, patterns: (response.patterns ?? []).map(normalizePatternPoint).filter((item): item is PatternPoint => item !== null) };
  }

  async search(query: string): Promise<{ type: 'block' | 'transaction' | 'address'; id: string; hash?: string; block_height?: number }> {
    return this.fetchJson(`/search?q=${encodeURIComponent(query)}`);
  }

  getReportDownloadUrl(type: 'block' | 'address', id: string, format: 'json' | 'csv' | 'html'): string {
    return `${API_BASE}/reports/${type}/${encodeURIComponent(id)}?format=${format}`;
  }

  async getAIBlockSummary(heightOrHash: string | number): Promise<AISummary> {
    return normalizeAISummary(await this.fetchJson<unknown>(`/ai/block/${heightOrHash}`));
  }

  getEventSourceUrl(): string {
    return `${API_BASE}/events`;
  }
}

export const api = new ApiClient();
