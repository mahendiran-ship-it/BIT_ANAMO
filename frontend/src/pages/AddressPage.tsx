import React, { useEffect, useState } from 'react';
import {
  Wallet,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  Activity,
  Download,
  TrendingUp
} from 'lucide-react';
import { api } from '../api/client';
import { AddressDetailData } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { CopyButton } from '../components/ui/CopyButton';
import { FollowButton } from '../components/ui/FollowButton';
import { VolumeChart } from '../components/charts/VolumeChart';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { formatDecimal, formatInteger } from '../utils/formatters';

interface AddressPageProps {
  address: string;
  onNavigateToBlock: (height: number) => void;
}

export const AddressPage: React.FC<AddressPageProps> = ({ address, onNavigateToBlock }) => {
  const [data, setData] = useState<AddressDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadAddressData();
  }, [address]);

  const loadAddressData = async () => {
    try {
      setLoading(true);
      const res = await api.getAddress(address);
      setData(res);
    } catch (err) {
      console.error('Failed to load address data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (ts?: number) => {
    if (!ts) return 'N/A';
    const d = new Date(ts * 1000);
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 pb-12">
        <LoadingSkeleton rows={2} height="h-20" />
        <LoadingSkeleton rows={4} height="h-28" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="intel-card p-12 text-center font-mono text-slate-400">
        Address data could not be found or has not been observed in analyzed blocks.
      </div>
    );
  }

  // Chart data of observed blocks
  const blockChartData = [...data.observed_blocks].reverse().map(b => ({
    name: `#${b.height}`,
    volume_btc: b.block_in_btc + b.block_out_btc,
    tx_count: b.tx_count
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Address Header Card */}
      <div className="intel-card p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-btc-primary" />
              <h1 className="text-lg font-bold font-mono text-white tracking-wide">
                BITCOIN ADDRESS DOSSIER
              </h1>
              {data.is_followed ? (
                <Badge variant="emerald" size="sm">MONITORED</Badge>
              ) : (
                <Badge variant="slate" size="sm">UNMONITORED</Badge>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <span className="text-intel-cyan font-bold break-all">{data.address}</span>
              <CopyButton text={data.address} title="Copy full address" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FollowButton
              address={data.address}
              isInitiallyFollowed={data.is_followed}
              onFollowChange={(f) => setData(d => d ? { ...d, is_followed: f } : null)}
              size="md"
            />

            <a
              href={api.getReportDownloadUrl('address', data.address, 'json')}
              download
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 text-xs font-mono transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Dossier</span>
            </a>
          </div>
        </div>

        {/* Observation Status Callout */}
        <div className="mt-4 pt-4 border-t border-dark-700/60 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
          <div>
            First Seen: <strong className="text-white">Block #{data.first_seen_height || 'N/A'}</strong> ({formatTimestamp(data.first_seen_timestamp)})
          </div>
          <span>&bull;</span>
          <div>
            Last Seen: <strong className="text-white">Block #{data.last_seen_height || 'N/A'}</strong> ({formatTimestamp(data.last_seen_timestamp)})
          </div>
          <span>&bull;</span>
          <div>
            Observed In: <strong className="text-intel-cyan">{data.observed_blocks.length} block(s)</strong>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <StatCard
          label="Total Observed TXs"
          value={formatInteger(data.total_tx_count)}
          subValue="Across Ingested Blocks"
          icon={Activity}
          iconColor="text-intel-cyan"
        />

        <StatCard
          label="Total Incoming (IN)"
          value={`+${formatDecimal(data.total_in_btc, 4)}`}
          subValue="BTC Received"
          icon={ArrowDownLeft}
          iconColor="text-intel-emerald"
        />

        <StatCard
          label="Total Outgoing (OUT)"
          value={`-${formatDecimal(data.total_out_btc, 4)}`}
          subValue="BTC Sent"
          icon={ArrowUpRight}
          iconColor="text-intel-rose"
        />

        <StatCard
          label="Net Observed Flow"
          value={`${data.net_flow_btc > 0 ? '+' : ''}${formatDecimal(data.net_flow_btc, 4)}`}
          subValue="BTC Net Balance Delta"
          icon={TrendingUp}
          iconColor={data.net_flow_btc >= 0 ? 'text-intel-emerald' : 'text-intel-rose'}
        />
      </div>

      {/* Activity Timeline Chart */}
      {blockChartData.length > 0 && (
        <div className="intel-card p-5">
          <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-intel-cyan" />
            Address Volume Activity Across Analyzed Blocks
          </h3>
          <p className="text-xs font-mono text-slate-400 mb-5">
            Total Bitcoin flow involving this address in each observed block
          </p>
          <VolumeChart data={blockChartData} height={260} />
        </div>
      )}

      {/* Observed Blocks & Related Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blocks Where Observed */}
        <div className="intel-card overflow-hidden">
          <div className="intel-card-header">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-btc-primary" />
              <span className="text-xs font-bold font-mono tracking-wider text-white uppercase">
                Observed In Blocks ({data.observed_blocks.length})
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">Click to inspect block</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-950/80 text-slate-400 border-b border-dark-700/60">
                <tr>
                  <th className="py-2.5 px-3">Block Height</th>
                  <th className="py-2.5 px-3">TXs</th>
                  <th className="py-2.5 px-3">Incoming</th>
                  <th className="py-2.5 px-3">Outgoing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/40">
                {data.observed_blocks.map((b) => (
                  <tr
                    key={b.hash}
                    onClick={() => onNavigateToBlock(b.height)}
                    className="hover:bg-dark-800/60 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 text-btc-primary font-bold">
                      #{b.height}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">
                      {b.tx_count}
                    </td>
                    <td className="py-2.5 px-3 text-intel-emerald">
                      +{formatDecimal(b.block_in_btc, 4)} BTC
                    </td>
                    <td className="py-2.5 px-3 text-intel-rose">
                      -{formatDecimal(b.block_out_btc, 4)} BTC
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Related Transactions */}
        <div className="intel-card overflow-hidden">
          <div className="intel-card-header">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-intel-cyan" />
              <span className="text-xs font-bold font-mono tracking-wider text-white uppercase">
                Observed Transactions ({data.recent_transactions.length})
              </span>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[360px]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-950/80 text-slate-400 border-b border-dark-700/60 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">TXID</th>
                  <th className="py-2.5 px-3">Block</th>
                  <th className="py-2.5 px-3">Direction</th>
                  <th className="py-2.5 px-3 text-right">Amount (BTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/40">
                {data.recent_transactions.map((tx, idx) => (
                  <tr key={`${tx.txid}-${idx}`} className="hover:bg-dark-800/60 transition-colors">
                    <td className="py-2.5 px-3 text-slate-200 truncate max-w-[120px]">
                      {tx.txid.substring(0, 8)}...
                    </td>
                    <td
                      className="py-2.5 px-3 text-btc-primary cursor-pointer hover:underline"
                      onClick={() => onNavigateToBlock(tx.block_height)}
                    >
                      #{tx.block_height}
                    </td>
                    <td className="py-2.5 px-3">
                      {tx.direction === 'IN' ? (
                        <Badge variant="emerald" size="sm">IN (Received)</Badge>
                      ) : (
                        <Badge variant="rose" size="sm">OUT (Sent)</Badge>
                      )}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${tx.direction === 'IN' ? 'text-intel-emerald' : 'text-intel-rose'}`}>
                      {tx.direction === 'IN' ? '+' : '-'}{formatDecimal(tx.amount_btc, 6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
