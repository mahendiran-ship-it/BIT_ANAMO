import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Coins,
  Receipt,
  ArrowDownUp,
  Clock,
  ShieldCheck,
  RotateCw,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  Users,
  BarChart3,
  GitCommit,
  Bot
} from 'lucide-react';
import { api } from '../api/client';
import { AISummary, BlockAnalysisData, TransactionItem } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { CopyButton } from '../components/ui/CopyButton';
import { FollowButton } from '../components/ui/FollowButton';
import { ActivityChart } from '../components/charts/ActivityChart';
import { InOutChart } from '../components/charts/InOutChart';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { formatDecimal, formatInteger } from '../utils/formatters';

interface BlockAnalysisPageProps {
  blockHeight: number;
  onNavigateToAddress: (address: string) => void;
  onNavigateToBlock: (height: number) => void;
}

export const BlockAnalysisPage: React.FC<BlockAnalysisPageProps> = ({
  blockHeight,
  onNavigateToAddress,
  onNavigateToBlock
}) => {
  const [data, setData] = useState<BlockAnalysisData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reanalyzing, setReanalyzing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'transactions' | 'addresses' | 'amounts' | 'in_out' | 'timeline' | 'ai'
  >('overview');

  // Transactions Tab States
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txTotal, setTxTotal] = useState<number>(0);
  const [txPage, setTxPage] = useState<number>(1);
  const [txSearch, setTxSearch] = useState<string>('');
  const [txSortBy, setTxSortBy] = useState<string>('amount_btc');
  const [txOrder, setTxOrder] = useState<string>('desc');
  const [txLoading, setTxLoading] = useState<boolean>(false);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  useEffect(() => {
    loadBlockAnalysis();
  }, [blockHeight]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [activeTab, txPage, txSortBy, txOrder]);

  const loadBlockAnalysis = async () => {
    try {
      setLoading(true);
      const res = await api.getBlockAnalysis(blockHeight);
      setData(res);
    } catch (err) {
      console.error('Failed to load block analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setTxLoading(true);
      const limit = 25;
      const offset = (txPage - 1) * limit;
      const res = await api.getBlockTransactions(blockHeight, {
        limit,
        offset,
        search: txSearch || undefined,
        sort_by: txSortBy,
        order: txOrder
      });
      setTransactions(res.transactions);
      setTxTotal(res.total);
    } catch (err) {
      console.error('Failed to load block transactions:', err);
    } finally {
      setTxLoading(false);
    }
  };

  const handleReanalyze = async () => {
    try {
      setReanalyzing(true);
      await api.reanalyzeBlock(blockHeight);
      await loadBlockAnalysis();
      if (activeTab === 'transactions') {
        await loadTransactions();
      }
    } catch (err) {
      console.error('Failed to re-analyze block:', err);
    } finally {
      setReanalyzing(false);
    }
  };

  const loadAiSummary = async () => {
    try {
      setAiLoading(true);
      setAiSummary(await api.getAIBlockSummary(blockHeight));
    } catch (err) {
      console.error('Failed to load Groq summary:', err);
      setAiSummary({
        status: 'unavailable',
        provider: 'groq',
        message: 'The AI summary service is unavailable. The verified block data remains available below.',
        structured_payload: {},
      });
    } finally {
      setAiLoading(false);
    }
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts * 1000);
    const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' });
    return `${dateStr} ${timeStr} UTC`;
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 pb-12">
        <LoadingSkeleton rows={2} height="h-20" />
        <LoadingSkeleton rows={4} height="h-32" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="intel-card p-12 text-center font-mono text-slate-400">
        Block #{blockHeight} could not be loaded or is not yet analyzed.
      </div>
    );
  }

  const { block, top_addresses, volume_distribution, time_series, in_out_totals } = data;

  return (
    <div className="space-y-6 pb-12">
      {/* Block Header Navigation & Actions */}
      <div className="intel-card p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigateToBlock(block.height - 1)}
                className="p-1 rounded bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white transition-colors"
                title={`Previous block #${block.height - 1}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h1 className="text-xl font-bold font-mono text-white tracking-wide flex items-center gap-2">
                <Boxes className="w-5 h-5 text-btc-primary" />
                BLOCK #{formatInteger(block.height)}
              </h1>

              <button
                onClick={() => onNavigateToBlock(block.height + 1)}
                className="p-1 rounded bg-dark-800 hover:bg-dark-750 text-slate-400 hover:text-white transition-colors"
                title={`Next block #${block.height + 1}`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <Badge variant="emerald" size="sm">ANALYZED</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <span>Hash:</span>
                <span className="text-slate-200">{block.hash}</span>
                <CopyButton text={block.hash} title="Copy block hash" />
              </div>
              <span>&bull;</span>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-intel-cyan" />
                <span>{formatTimestamp(block.timestamp)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 text-xs font-mono transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${reanalyzing ? 'animate-spin text-btc-primary' : ''}`} />
              <span>{reanalyzing ? 'Re-analyzing...' : 'Re-Analyze'}</span>
            </button>

            <a
              href={api.getReportDownloadUrl('block', block.height.toString(), 'json')}
              download
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-200 border border-dark-700 text-xs font-mono transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </a>
          </div>
        </div>

        {/* Honest Scope Callout */}
        <div className="mt-4 pt-4 border-t border-dark-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono bg-dark-950/60 p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-intel-emerald" />
            <span className="text-slate-300">
              <strong className="text-white">REAL BLOCK DATA:</strong> {formatInteger(block.tx_count)} total block transactions &bull; Analyzed: <strong className="text-intel-cyan">{formatInteger(block.analyzed_tx_count)}</strong> &bull; Coverage: <strong className="text-btc-primary">{block.coverage_pct}%</strong>
            </span>
          </div>
          <span className="text-slate-400">
            Backend Latency: <strong className="text-slate-200">{block.total_time_sec}s</strong> (Analysis: <strong className="text-intel-emerald">{block.analysis_time_sec}s</strong>)
          </span>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-dark-700/80 pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: Layers },
          { id: 'transactions', label: `Transactions (${block.analyzed_tx_count})`, icon: GitCommit },
          { id: 'addresses', label: `Addresses (${top_addresses.length})`, icon: Users },
          { id: 'amounts', label: 'Amounts Distribution', icon: BarChart3 },
          { id: 'in_out', label: 'IN / OUT Flow', icon: ArrowDownUp },
          { id: 'timeline', label: 'Timeline', icon: Clock },
          { id: 'ai', label: 'AI Insight', icon: Bot, badge: 'Groq' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-medium transition-all
                ${isActive
                  ? 'bg-btc-primary text-white font-bold shadow-glow-btc/20'
                  : 'bg-dark-900 text-slate-400 hover:text-slate-200 hover:bg-dark-800 border border-dark-700/60'
                }
              `}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-dark-950 text-intel-cyan font-bold border border-intel-cyan/30">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            <StatCard label="Total Volume" value={formatDecimal(block.total_volume_btc, 2)} subValue="BTC" icon={Coins} iconColor="text-btc-primary" />
            <StatCard label="Total Miner Fees" value={formatDecimal(block.total_fees_btc, 4)} subValue="BTC" icon={Receipt} iconColor="text-intel-blue" />
            <StatCard label="Average TX Amount" value={formatDecimal(block.avg_tx_btc, 4)} subValue="BTC" icon={Sparkles} iconColor="text-intel-cyan" />
            <StatCard label="Largest Transaction" value={formatDecimal(block.largest_tx_btc, 2)} subValue="BTC" icon={Coins} iconColor="text-intel-amber" />
            <StatCard label="Smallest Transaction" value={formatDecimal(block.smallest_tx_btc, 6)} subValue="BTC" icon={Coins} iconColor="text-slate-400" />
            <StatCard label="Input Count" value={formatInteger(block.input_count)} subValue="UTXOs" icon={ArrowDownUp} iconColor="text-intel-emerald" />
            <StatCard label="Output Count" value={formatInteger(block.output_count)} subValue="Vouts" icon={ArrowDownUp} iconColor="text-intel-rose" />
            <StatCard label="Analysis Processing Time" value={`${block.analysis_time_sec}s`} subValue={`Total: ${block.total_time_sec}s`} icon={Clock} iconColor="text-intel-emerald" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="intel-card p-5">
              <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-btc-primary" />
                Transaction Size Spectrum
              </h3>
              <div className="space-y-2.5">
                {volume_distribution.map((item) => {
                  const itemCount = typeof item.count === 'number' ? item.count : 0;
                  const pct = block.analyzed_tx_count > 0 ? formatDecimal((itemCount / block.analyzed_tx_count) * 100, 1) : '0';
                  return (
                    <div key={item.range} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300">{item.range}</span>
                        <span className="text-slate-400">{formatInteger(item.count)} txs ({pct}%)</span>
                      </div>
                      <div className="w-full bg-dark-950 rounded-full h-2 overflow-hidden border border-dark-700/50">
                        <div className="bg-btc-primary h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="intel-card p-5">
              <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <ArrowDownUp className="w-4 h-4 text-intel-cyan" />
                UTXO Flow Breakdown
              </h3>
              <div className="grid grid-cols-2 gap-4 my-2">
                <div className="p-3 rounded-lg bg-dark-950 border border-dark-700/60">
                  <span className="text-[10px] uppercase font-mono text-slate-400">Total Incoming Flow</span>
                  <div className="text-lg font-bold font-mono text-intel-emerald mt-1">
                    {formatDecimal(in_out_totals.total_in_btc, 2)} BTC
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">{in_out_totals.total_outputs} Outputs</span>
                </div>
                <div className="p-3 rounded-lg bg-dark-950 border border-dark-700/60">
                  <span className="text-[10px] uppercase font-mono text-slate-400">Total Outgoing Flow</span>
                  <div className="text-lg font-bold font-mono text-intel-rose mt-1">
                    {formatDecimal(in_out_totals.total_out_btc, 2)} BTC
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">{in_out_totals.total_inputs} Inputs</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-dark-950/80 border border-dark-700/40 text-xs font-mono text-slate-300 space-y-1 mt-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Unique Active Addresses:</span>
                  <span className="text-white font-bold">{formatInteger(in_out_totals.unique_addresses)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Fee Burn/Miner Reward:</span>
                  <span className="text-intel-blue font-bold">{formatDecimal(block.total_fees_btc, 4)} BTC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="intel-card overflow-hidden">
          <div className="intel-card-header flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-intel-cyan" />
              <span className="text-xs font-bold font-mono tracking-wider text-white uppercase">
                Analyzed Transactions ({formatInteger(txTotal)})
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => {
                    setTxSearch(e.target.value);
                    setTxPage(1);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && loadTransactions()}
                  placeholder="Filter by TXID..."
                  className="w-full pl-8 pr-3 py-1 bg-dark-950 border border-dark-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-intel-cyan"
                />
              </div>

              <select
                value={txSortBy}
                onChange={(e) => {
                  setTxSortBy(e.target.value);
                  setTxPage(1);
                }}
                className="bg-dark-950 border border-dark-700 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 focus:outline-none"
              >
                <option value="amount_btc">Sort by Amount</option>
                <option value="fee_btc">Sort by Fee</option>
                <option value="input_count">Sort by Inputs</option>
                <option value="output_count">Sort by Outputs</option>
              </select>

              <select
                value={txOrder}
                onChange={(e) => {
                  setTxOrder(e.target.value);
                  setTxPage(1);
                }}
                className="bg-dark-950 border border-dark-700 rounded-lg px-2 py-1 text-xs font-mono text-slate-200 focus:outline-none"
              >
                <option value="desc">DESC</option>
                <option value="asc">ASC</option>
              </select>
            </div>
          </div>

          {txLoading ? (
            <div className="p-6">
              <LoadingSkeleton rows={5} height="h-10" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-dark-950/80 text-slate-400 border-b border-dark-700/60">
                  <tr>
                    <th className="py-2.5 px-4">TXID</th>
                    <th className="py-2.5 px-4">Amount (BTC)</th>
                    <th className="py-2.5 px-4">Fee (BTC)</th>
                    <th className="py-2.5 px-4">Inputs</th>
                    <th className="py-2.5 px-4">Outputs</th>
                    <th className="py-2.5 px-4">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/40">
                  {transactions.map((t) => (
                    <tr key={t.txid} className="hover:bg-dark-800/60 transition-colors">
                      <td className="py-2.5 px-4 text-slate-200 flex items-center gap-1.5">
                        <span className="hover:text-intel-cyan cursor-pointer truncate max-w-[200px]">
                          {t.txid}
                        </span>
                        <CopyButton text={t.txid} title="Copy TXID" />
                      </td>
                      <td className="py-2.5 px-4 text-white font-bold">
                        {formatDecimal(t.amount_btc, 6)} BTC
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {formatDecimal(t.fee_btc, 8)} BTC
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">
                        {t.input_count}
                      </td>
                      <td className="py-2.5 px-4 text-slate-300">
                        {t.output_count}
                      </td>
                      <td className="py-2.5 px-4">
                        {t.is_coinbase === 1 ? (
                          <Badge variant="amber" size="sm">Coinbase</Badge>
                        ) : (
                          <Badge variant="slate" size="sm">Standard</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="p-3 border-t border-dark-700/60 bg-dark-950/40 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>
                  Showing {((txPage - 1) * 25) + 1} - {Math.min(txPage * 25, txTotal)} of {formatInteger(txTotal)}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTxPage(p => Math.max(1, p - 1))}
                disabled={txPage === 1}
                className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-750 disabled:opacity-40 disabled:pointer-events-none text-slate-200"
              >
                Previous
              </button>
              <span className="px-2 font-bold text-white">Page {txPage}</span>
              <button
                onClick={() => setTxPage(p => p + 1)}
                disabled={txPage * 25 >= txTotal}
                className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-750 disabled:opacity-40 disabled:pointer-events-none text-slate-200"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ADDRESSES */}
      {activeTab === 'addresses' && (
        <div className="intel-card overflow-hidden">
          <div className="intel-card-header">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-intel-cyan" />
              <span className="text-xs font-bold font-mono tracking-wider text-white uppercase">
                Most Active Addresses Observed in Block #{block.height}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Click Follow to monitor across subsequent blocks
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-950/80 text-slate-400 border-b border-dark-700/60">
                <tr>
                  <th className="py-2.5 px-4">Address</th>
                  <th className="py-2.5 px-4">TX Count</th>
                  <th className="py-2.5 px-4">Total IN (BTC)</th>
                  <th className="py-2.5 px-4">Total OUT (BTC)</th>
                  <th className="py-2.5 px-4">Net Flow (BTC)</th>
                  <th className="py-2.5 px-4 text-right">Follow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/40">
                {top_addresses.map((a) => (
                  <tr
                    key={a.address}
                    onClick={() => onNavigateToAddress(a.address)}
                    className="hover:bg-dark-800/60 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 text-slate-200 flex items-center gap-1.5 font-medium">
                      <span className="hover:text-intel-cyan">
                        {a.address}
                      </span>
                      <CopyButton text={a.address} title="Copy address" />
                    </td>
                    <td className="py-2.5 px-4 text-intel-cyan font-bold">
                      {a.tx_count}
                    </td>
                    <td className="py-2.5 px-4 text-intel-emerald font-semibold">
                      +{formatDecimal(a.total_in_btc, 4)}
                    </td>
                    <td className="py-2.5 px-4 text-intel-rose font-semibold">
                      -{formatDecimal(a.total_out_btc, 4)}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-white">
                      {a.net_flow_btc > 0 ? `+${formatDecimal(a.net_flow_btc, 4)}` : formatDecimal(a.net_flow_btc, 4)}
                    </td>
                    <td className="py-2.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <FollowButton
                        address={a.address}
                        isInitiallyFollowed={a.is_followed}
                        size="sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AMOUNTS */}
      {activeTab === 'amounts' && (
        <div className="intel-card p-5">
          <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider mb-2 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-btc-primary" />
            Transaction Amount Distribution
          </h3>
          <p className="text-xs font-mono text-slate-400 mb-6">
            Count of analyzed transactions partitioned by output volume range
          </p>
          <ActivityChart
            data={volume_distribution.map(v => ({ name: v.range, tx_count: v.count }))}
            height={320}
          />
        </div>
      )}

      {/* TAB 5: IN / OUT */}
      {activeTab === 'in_out' && (
        <div className="intel-card p-5">
          <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider mb-2 flex items-center gap-2">
            <ArrowDownUp className="w-4 h-4 text-intel-emerald" />
            Incoming vs Outgoing Value Comparison
          </h3>
          <p className="text-xs font-mono text-slate-400 mb-6">
            Aggregate Bitcoin moved across input and output UTXOs in this block
          </p>
          <InOutChart
            data={[
              {
                name: `Block #${block.height}`,
                incoming: in_out_totals.total_in_btc,
                outgoing: in_out_totals.total_out_btc
              }
            ]}
            height={320}
          />
        </div>
      )}

      {/* TAB 6: TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="intel-card p-5">
          <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-intel-cyan" />
            Transaction Activity Distribution Across Block Segments
          </h3>
          <p className="text-xs font-mono text-slate-400 mb-6">
            Evenly segmented activity slices across the analyzed block transactions
          </p>
          <ActivityChart
            data={time_series.map(s => ({ name: s.segment, tx_count: s.tx_count, volume_btc: s.volume_btc }))}
            height={320}
          />
        </div>
      )}

      {/* TAB 7: AI INSIGHT */}
      {activeTab === 'ai' && (
        <div className="intel-card p-6 border-intel-cyan/40">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-intel-cyan/15 border border-intel-cyan/30 text-intel-cyan">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold font-mono text-white tracking-wide">
                  GROQ BLOCK INTELLIGENCE SUMMARY
                </h3>
                <Badge variant="cyan" size="sm">Backend AI</Badge>
              </div>
              <p className="text-xs font-mono text-slate-300 mt-2 leading-relaxed">
                Groq receives only the verified block analysis shown below. The backend prompt requires the model to use those values only and to state when coverage is partial.
              </p>
              <button
                onClick={loadAiSummary}
                disabled={aiLoading}
                className="mt-3 px-3 py-1.5 rounded-lg bg-intel-cyan/15 border border-intel-cyan/40 text-intel-cyan text-xs font-mono font-bold disabled:opacity-50"
              >
                {aiLoading ? 'Generating summary...' : 'Generate Groq Summary'}
              </button>
            </div>
          </div>

          {aiSummary && (
            <div className={`mt-5 p-4 rounded-lg border font-mono text-xs ${aiSummary.status === 'ok' ? 'border-intel-emerald/40 bg-intel-emerald/10' : 'border-intel-amber/40 bg-intel-amber/10'}`}>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-2">
                {aiSummary.status === 'ok' ? `Generated by ${aiSummary.provider}${aiSummary.model ? ` / ${aiSummary.model}` : ''}` : 'AI unavailable'}
              </div>
              <p className="text-slate-200 leading-relaxed">{aiSummary.summary || aiSummary.message}</p>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-dark-700/60">
            <h4 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider mb-2">
              Structured Block Intelligence Payload Preview:
            </h4>
            <pre className="bg-dark-950 border border-dark-700/60 rounded-xl p-4 text-xs font-mono text-intel-cyan overflow-x-auto leading-relaxed">
{JSON.stringify({
  block_height: block.height,
  block_hash: block.hash,
  total_transactions: block.tx_count,
  transactions_analyzed: block.analyzed_tx_count,
  coverage_pct: block.coverage_pct,
  total_volume_btc: block.total_volume_btc,
  total_fees_btc: block.total_fees_btc,
  largest_transaction_btc: block.largest_tx_btc,
  average_transaction_btc: block.avg_tx_btc,
  input_count: block.input_count,
  output_count: block.output_count,
  most_active_addresses_count: top_addresses.length,
  top_address_sample: top_addresses[0]?.address || "none"
}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
