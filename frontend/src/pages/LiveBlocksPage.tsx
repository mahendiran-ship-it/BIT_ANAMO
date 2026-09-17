import React, { useEffect, useState } from 'react';
import { Boxes, RefreshCw, Clock, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { BlockSummary } from '../types';
import { useRealtime } from '../context/useRealtime';
import { FilterBar, FilterState } from '../components/layout/FilterBar';
import { Badge } from '../components/ui/Badge';
import { CopyButton } from '../components/ui/CopyButton';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { formatInteger } from '../utils/formatters';

interface LiveBlocksPageProps {
  onSelectBlock: (height: number) => void;
}

export const LiveBlocksPage: React.FC<LiveBlocksPageProps> = ({ onSelectBlock }) => {
  const { latestBlock, pulseBlockHeight } = useRealtime();
  const [blocks, setBlocks] = useState<BlockSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<FilterState>({
    timeWindow: '10d',
    minTxCount: 'all',
    minAmountBtc: 'all',
    direction: 'ALL',
    addressActivity: 'all'
  });

  useEffect(() => {
    loadBlocks();
  }, [latestBlock?.height]);

  const loadBlocks = async () => {
    try {
      setLoading(true);
      const res = await api.listBlocks({ limit: 50, window_days: 10 });
      setBlocks(res.blocks);
    } catch (err) {
      console.error('Failed to load blocks:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter blocks based on filter state
  const filteredBlocks = blocks.filter((b) => {
    if (filters.timeWindow !== 'all') {
      const windowSeconds = filters.timeWindow === '1h' ? 3600 : filters.timeWindow === '24h' ? 86400 : 10 * 86400;
      if (b.timestamp < Math.floor(Date.now() / 1000) - windowSeconds) return false;
    }
    if (filters.minTxCount !== 'all') {
      if (b.tx_count < parseInt(filters.minTxCount)) return false;
    }
    if (filters.minAmountBtc !== 'all') {
      if (b.total_volume_btc < parseFloat(filters.minAmountBtc)) return false;
    }
    return true;
  });

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts * 1000);
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' });
    return `${dateStr} ${timeStr} UTC`;
  };

  const getRelativeTime = (ts: number) => {
    const diff = Math.floor(Date.now() / 1000 - ts);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-700/60 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide font-mono flex items-center gap-2">
            <Boxes className="w-5 h-5 text-btc-primary" />
            LIVE BLOCKS FEED
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Real-time Bitcoin block stream &bull; Ingestion telemetry &bull; Deterministic coverage metrics
          </p>
        </div>

        <button
          onClick={loadBlocks}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700 hover:bg-dark-800 text-slate-300 text-xs font-mono transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-intel-cyan' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        onReset={() => {}}
        showDirection={false}
        showAddressActivity={false}
      />

      {/* Live Blocks Table */}
      <div className="intel-card overflow-hidden">
        <div className="intel-card-header">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-intel-cyan" />
            <span className="text-xs font-bold font-mono tracking-wider text-white uppercase">
              10-Day Rolling Window Blocks ({filteredBlocks.length})
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Newest arrivals at top
          </span>
        </div>

        {loading && blocks.length === 0 ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} height="h-12" />
          </div>
        ) : filteredBlocks.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">
            No blocks matching current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-950/90 text-slate-400 border-b border-dark-700/70">
                <tr>
                  <th className="py-3 px-4">Height</th>
                  <th className="py-3 px-4">Block Hash</th>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Total TX</th>
                  <th className="py-3 px-4">Analyzed</th>
                  <th className="py-3 px-4">Coverage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Analysis Time</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/40">
                {filteredBlocks.map((b) => {
                  const isPulsing = pulseBlockHeight === b.height;
                  return (
                    <tr
                      key={b.hash}
                      onClick={() => onSelectBlock(b.height)}
                      className={`hover:bg-dark-800/70 cursor-pointer transition-all duration-300 ${
                        isPulsing ? 'bg-btc-primary/20 animate-pulse' : ''
                      }`}
                    >
                      {/* Height */}
                      <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                        <span className="text-btc-primary text-sm font-bold">
                          #{b.height}
                        </span>
                        {isPulsing && (
                          <span className="px-1.5 py-0.5 text-[9px] rounded bg-btc-primary text-black font-bold uppercase animate-bounce">
                            New Block
                          </span>
                        )}
                      </td>

                      {/* Hash */}
                      <td className="py-3 px-4 text-slate-300">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-mono">
                            {b.hash.substring(0, 10)}...{b.hash.substring(b.hash.length - 8)}
                          </span>
                          <CopyButton text={b.hash} title="Copy block hash" />
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-300" title={formatTimestamp(b.timestamp)}>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{getRelativeTime(b.timestamp)}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block">
                          {formatTimestamp(b.timestamp)}
                        </span>
                      </td>

                      {/* Total TX */}
                      <td className="py-3 px-4 text-slate-200 font-semibold">
                        {formatInteger(b.tx_count)}
                      </td>

                      {/* Analyzed */}
                      <td className="py-3 px-4 text-intel-cyan font-bold">
                        {formatInteger(b.analyzed_tx_count)}
                      </td>

                      {/* Coverage % */}
                      <td className="py-3 px-4">
                        <Badge
                          variant={b.coverage_pct > 50 ? 'emerald' : b.coverage_pct > 20 ? 'cyan' : 'amber'}
                          size="sm"
                        >
                          {b.coverage_pct}%
                        </Badge>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-intel-emerald text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-intel-emerald" />
                          <span>Analyzed</span>
                        </span>
                      </td>

                      {/* Analysis Time */}
                      <td className="py-3 px-4 text-slate-300">
                        <span className="text-white font-bold">{b.total_time_sec}s</span>
                        <span className="text-[10px] text-slate-500 block">
                          (Analysis: {b.analysis_time_sec}s)
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-750 text-intel-cyan border border-dark-700 text-xs flex items-center gap-1 ml-auto font-medium transition-colors">
                          <span>Inspect</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
