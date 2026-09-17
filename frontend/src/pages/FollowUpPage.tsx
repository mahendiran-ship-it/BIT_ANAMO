import React, { useEffect, useState } from 'react';
import {
  Radar,
  Activity,
  X,
  Trash2,
  RefreshCw,
  GitCompare
} from 'lucide-react';
import { api } from '../api/client';
import { FollowedAddressItem, FollowUpEventItem } from '../types';
import { Badge } from '../components/ui/Badge';
import { CopyButton } from '../components/ui/CopyButton';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { formatDecimal, formatInteger } from '../utils/formatters';

interface FollowUpPageProps {
  onNavigateToAddress: (address: string) => void;
  onNavigateToBlock: (height: number) => void;
}

export const FollowUpPage: React.FC<FollowUpPageProps> = ({
  onNavigateToAddress,
  onNavigateToBlock
}) => {
  const [addresses, setAddresses] = useState<FollowedAddressItem[]>([]);
  const [events, setEvents] = useState<FollowUpEventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Comparison Modal state
  const [comparingAddress, setComparingAddress] = useState<string | null>(null);
  const [comparisonData, setComparisonData] = useState<any | null>(null);
  const [comparingLoading, setComparingLoading] = useState<boolean>(false);

  useEffect(() => {
    loadFollowedData();
  }, []);

  const loadFollowedData = async () => {
    try {
      setLoading(true);
      const [addrRes, eventRes] = await Promise.all([
        api.getFollowed(),
        api.getFollowedActivity(30)
      ]);
      setAddresses(addrRes.followed_addresses);
      setEvents(eventRes.events);
    } catch (err) {
      console.error('Failed to load followed data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (address: string) => {
    try {
      await api.unfollowAddress(address);
      setAddresses(prev => prev.filter(a => a.address !== address));
    } catch (err) {
      console.error('Failed to unfollow address:', err);
    }
  };

  const handleOpenCompare = async (address: string) => {
    setComparingAddress(address);
    setComparingLoading(true);
    try {
      const res = await api.compareAddress(address);
      setComparisonData(res);
    } catch (err) {
      console.error('Failed to load comparison:', err);
    } finally {
      setComparingLoading(false);
    }
  };

  const formatTimestamp = (ts?: number) => {
    if (!ts) return 'N/A';
    const d = new Date(ts * 1000);
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-700/60 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide font-mono flex items-center gap-2">
            <Radar className="w-5 h-5 text-intel-cyan animate-pulse" />
            FOLLOW-UP MONITORING WORKSPACE
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Persistent multi-block tracking &bull; Neutral temporal activity comparison &bull; Automated block detection
          </p>
        </div>

        <button
          onClick={loadFollowedData}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-900 border border-dark-700 hover:bg-dark-800 text-slate-300 text-xs font-mono transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-intel-cyan' : ''}`} />
          <span>Refresh Watchlist</span>
        </button>
      </div>

      {/* Followed Addresses Monitoring Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>Followed Addresses ({addresses.length})</span>
          <span>Information persists past the 10-day rolling window</span>
        </div>

        {loading && addresses.length === 0 ? (
          <LoadingSkeleton rows={3} height="h-28" />
        ) : addresses.length === 0 ? (
          <div className="intel-card p-12 text-center font-mono">
            <Radar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-300 text-sm font-semibold">No addresses currently followed.</p>
            <p className="text-slate-500 text-xs mt-1">
              Visit Live Blocks or Block Analysis, inspect any active address, and click <strong className="text-btc-primary">[ FOLLOW ]</strong> to start monitoring here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {addresses.map((item) => {
              const sign = item.latest_activity_change_pct >= 0 ? '+' : '';
              return (
                <div
                  key={item.address}
                  className="intel-card p-5 hover:border-intel-cyan/40 transition-all duration-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Address & Status */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <Badge variant="emerald" size="sm">MONITORING ACTIVE</Badge>
                        <span className="text-[11px] font-mono text-slate-400">
                          First seen: Block #{item.first_seen_height} &bull; Latest: Block #{item.last_seen_height}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => onNavigateToAddress(item.address)}
                          className="text-sm font-bold font-mono text-white hover:text-intel-cyan cursor-pointer truncate"
                        >
                          {item.address}
                        </span>
                        <CopyButton text={item.address} title="Copy address" />
                      </div>
                    </div>

                    {/* Middle: Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono py-2 lg:py-0 border-y lg:border-y-0 border-dark-700/60">
                      <div>
                        <span className="text-slate-500 uppercase text-[10px] block">Observed TXs</span>
                        <span className="text-white font-bold text-sm">{formatInteger(item.total_tx_count)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[10px] block">Total IN</span>
                        <span className="text-intel-emerald font-bold text-sm">+{formatDecimal(item.total_in_btc, 4)} BTC</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[10px] block">Total OUT</span>
                        <span className="text-intel-rose font-bold text-sm">-{formatDecimal(item.total_out_btc, 4)} BTC</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase text-[10px] block">Activity Variation</span>
                        <span className={`font-bold text-sm ${item.latest_activity_change_pct >= 0 ? 'text-intel-cyan' : 'text-intel-amber'}`}>
                          {sign}{item.latest_activity_change_pct}%
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onNavigateToAddress(item.address)}
                        className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 text-xs font-mono font-medium transition-colors"
                      >
                        VIEW
                      </button>

                      <button
                        onClick={() => handleOpenCompare(item.address)}
                        className="px-3 py-1.5 rounded-lg bg-intel-cyan/15 hover:bg-intel-cyan/25 text-intel-cyan border border-intel-cyan/30 text-xs font-mono font-bold transition-colors flex items-center gap-1.5"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>COMPARE</span>
                      </button>

                      <button
                        onClick={() => handleUnfollow(item.address)}
                        className="p-1.5 rounded-lg bg-dark-800 hover:bg-intel-rose/20 text-slate-400 hover:text-intel-rose border border-dark-700 transition-colors"
                        title="Unfollow address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monitoring Alert Timeline Feed */}
      {events.length > 0 && (
        <div className="intel-card overflow-hidden mt-8">
          <div className="intel-card-header">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-intel-cyan" />
              <span className="text-xs font-bold font-mono tracking-wider text-white uppercase">
                Cross-Block Follow-Up Event Log ({events.length})
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Auto-detected when followed address appears in later blocks
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-950/80 text-slate-400 border-b border-dark-700/60">
                <tr>
                  <th className="py-2.5 px-4">Event</th>
                  <th className="py-2.5 px-4">Address</th>
                  <th className="py-2.5 px-4">Block Height</th>
                  <th className="py-2.5 px-4">Block TXs</th>
                  <th className="py-2.5 px-4">Flow (IN / OUT)</th>
                  <th className="py-2.5 px-4">Activity Change</th>
                  <th className="py-2.5 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/40">
                {events.map((ev) => {
                  const sign = ev.activity_change_pct >= 0 ? '+' : '';
                  return (
                    <tr key={ev.id} className="hover:bg-dark-800/60 transition-colors">
                      <td className="py-2.5 px-4">
                        <Badge variant="cyan" size="sm">Block Arrival</Badge>
                      </td>
                      <td
                        className="py-2.5 px-4 text-slate-200 hover:text-intel-cyan cursor-pointer truncate max-w-[140px]"
                        onClick={() => onNavigateToAddress(ev.address)}
                      >
                        {ev.address.substring(0, 8)}...{ev.address.substring(ev.address.length - 6)}
                      </td>
                      <td
                        className="py-2.5 px-4 text-btc-primary font-bold cursor-pointer hover:underline"
                        onClick={() => onNavigateToBlock(ev.block_height)}
                      >
                        #{ev.block_height}
                      </td>
                      <td className="py-2.5 px-4 text-white">
                        {ev.tx_count}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">
                        <span className="text-intel-emerald">+{formatDecimal(ev.incoming_btc, 4)}</span> / <span className="text-intel-rose">-{formatDecimal(ev.outgoing_btc, 4)}</span>
                      </td>
                      <td className="py-2.5 px-4 font-bold">
                        <span className={ev.activity_change_pct >= 0 ? 'text-intel-cyan' : 'text-intel-amber'}>
                          {sign}{ev.activity_change_pct}%
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-400">
                        {formatTimestamp(ev.timestamp)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {comparingAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="intel-card max-w-2xl w-full p-6 border-intel-cyan/40 shadow-2xl relative">
            <button
              onClick={() => {
                setComparingAddress(null);
                setComparisonData(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <GitCompare className="w-5 h-5 text-intel-cyan" />
              <h2 className="text-sm font-bold font-mono text-white tracking-wide uppercase">
                Temporal Activity Comparison
              </h2>
            </div>

            <div className="text-xs font-mono text-slate-400 mb-5 break-all">
              Address: <strong className="text-intel-cyan">{comparingAddress}</strong>
            </div>

            {comparingLoading || !comparisonData ? (
              <LoadingSkeleton rows={3} height="h-16" />
            ) : (
              <div className="space-y-4">
                {/* Neutral Comparison Cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Previous Period */}
                  <div className="p-4 rounded-xl bg-dark-950 border border-dark-700/60 font-mono text-xs space-y-2">
                    <span className="text-[10px] uppercase text-slate-400 block font-bold">
                      Previous Observation Period
                    </span>
                    {comparisonData.previous_period ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Block Height:</span>
                          <strong className="text-white">#{comparisonData.previous_period.block_height}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Transactions:</span>
                          <strong className="text-slate-200">{comparisonData.previous_period.transactions}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total Volume:</span>
                          <strong className="text-slate-200">{comparisonData.previous_period.total_volume_btc} BTC</strong>
                        </div>
                      </>
                    ) : (
                      <p className="text-slate-500 py-4">No prior period observed yet. Initial baseline recorded.</p>
                    )}
                  </div>

                  {/* Current Period */}
                  <div className="p-4 rounded-xl bg-dark-950 border border-dark-700/60 font-mono text-xs space-y-2">
                    <span className="text-[10px] uppercase text-intel-cyan block font-bold">
                      Current Observation Period
                    </span>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Block Height:</span>
                      <strong className="text-white">#{comparisonData.current_period.block_height}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Transactions:</span>
                      <strong className="text-slate-200">{comparisonData.current_period.transactions}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Volume:</span>
                      <strong className="text-slate-200">{comparisonData.current_period.total_volume_btc} BTC</strong>
                    </div>
                  </div>
                </div>

                {/* Analytical Variation Summary */}
                <div className="p-4 rounded-xl bg-dark-850/80 border border-dark-700/80 font-mono text-xs space-y-2">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
                    Observed Analytical Deltas (Neutral Terminology)
                  </span>
                  <div className="flex justify-between text-slate-300">
                    <span>Transaction Frequency Variation:</span>
                    <strong className={comparisonData.changes.activity_change_pct >= 0 ? 'text-intel-cyan' : 'text-intel-amber'}>
                      {comparisonData.changes.activity_change_pct >= 0 ? '+' : ''}{comparisonData.changes.activity_change_pct}%
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Observed Volume Variation:</span>
                    <strong className={comparisonData.changes.volume_change_pct >= 0 ? 'text-intel-cyan' : 'text-intel-amber'}>
                      {comparisonData.changes.volume_change_pct >= 0 ? '+' : ''}{comparisonData.changes.volume_change_pct}%
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
