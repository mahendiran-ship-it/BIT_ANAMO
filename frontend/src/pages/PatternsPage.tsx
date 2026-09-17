import React, { useEffect, useState } from 'react';
import { TrendingUp, Search } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { api } from '../api/client';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

export const PatternsPage: React.FC = () => {
  const [addressInput, setAddressInput] = useState<string>('bc1phj3nvfystppn2px9zrgdfv42j0f9zasu8gv7ak4zknkurwnkmjms7whlx4');
  const [selectedAddress, setSelectedAddress] = useState<string>('bc1phj3nvfystppn2px9zrgdfv42j0f9zasu8gv7ak4zknkurwnkmjms7whlx4');
  const [metric, setMetric] = useState<'volume' | 'transactions' | 'in_out' | 'cumulative'>('volume');
  const [patternData, setPatternData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedAddress) {
      loadPatterns(selectedAddress);
    }
  }, [selectedAddress]);

  const loadPatterns = async (addr: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getPatterns(addr);
      setPatternData(res.patterns);
    } catch {
      setError('No multi-block activity pattern found for this address in current rolling window.');
      setPatternData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (addressInput.trim()) {
      setSelectedAddress(addressInput.trim());
    }
  };

  const chartData = patternData.map((p) => ({
    name: `Block #${p.block_height}`,
    volume_btc: p.volume_btc,
    transactions: p.transactions,
    in_btc: p.in_btc,
    out_btc: p.out_btc,
    cumulative_transactions: p.cumulative_transactions,
    cumulative_volume: p.cumulative_volume_btc
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-700/60 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide font-mono flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-intel-cyan" />
            TEMPORAL ACTIVITY PATTERNS
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Longitudinal behavioral analysis across Bitcoin blocks &bull; Transaction velocity &bull; Volume deltas
          </p>
        </div>
      </div>

      {/* Target Address Selector & Metric Selector */}
      <div className="intel-card p-5">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Enter Bitcoin address to chart temporal patterns..."
              className="w-full pl-10 pr-4 py-2 bg-dark-950 border border-dark-700 rounded-lg text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-intel-cyan"
            />
          </div>

          <button
            type="submit"
            className="w-full md:w-auto px-5 py-2 rounded-lg bg-btc-primary hover:bg-btc-hover text-white text-xs font-mono font-bold transition-all shadow-glow-btc/20 flex items-center justify-center gap-2"
          >
            <span>Plot Pattern</span>
          </button>
        </form>

        {/* Metric Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-dark-700/60">
          <span className="text-xs font-mono text-slate-400 uppercase mr-2">Metric:</span>

          <button
            onClick={() => setMetric('volume')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
              metric === 'volume'
                ? 'bg-btc-primary text-white font-bold'
                : 'bg-dark-950 text-slate-400 hover:text-white border border-dark-700'
            }`}
          >
            BTC Volume
          </button>

          <button
            onClick={() => setMetric('transactions')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
              metric === 'transactions'
                ? 'bg-btc-primary text-white font-bold'
                : 'bg-dark-950 text-slate-400 hover:text-white border border-dark-700'
            }`}
          >
            Transaction Frequency
          </button>

          <button
            onClick={() => setMetric('in_out')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
              metric === 'in_out'
                ? 'bg-btc-primary text-white font-bold'
                : 'bg-dark-950 text-slate-400 hover:text-white border border-dark-700'
            }`}
          >
            IN vs OUT
          </button>

          <button
            onClick={() => setMetric('cumulative')}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
              metric === 'cumulative'
                ? 'bg-btc-primary text-white font-bold'
                : 'bg-dark-950 text-slate-400 hover:text-white border border-dark-700'
            }`}
          >
            Cumulative Velocity
          </button>
        </div>
      </div>

      {/* Pattern Visualization Canvas */}
      <div className="intel-card p-5">
        <div className="flex items-center justify-between mb-4 border-b border-dark-700/50 pb-3 text-xs font-mono">
          <div>
            <span className="text-slate-400 uppercase">Target Address: </span>
            <strong className="text-intel-cyan font-bold break-all">{selectedAddress}</strong>
          </div>
          <span className="text-slate-400">
            Observed Across: <strong className="text-white">{patternData.length} block(s)</strong>
          </span>
        </div>

        {loading ? (
          <div className="py-12">
            <LoadingSkeleton rows={4} height="h-16" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-slate-400 font-mono text-xs">
            {error}
          </div>
        ) : (
          <div className="w-full h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#334155' }}
                />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0C1220',
                    borderColor: '#2A3C63',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#F8FAFC',
                    fontFamily: 'monospace'
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontFamily: 'monospace' }}
                />

                {metric === 'volume' && (
                  <Line
                    type="monotone"
                    dataKey="volume_btc"
                    name="Volume (BTC)"
                    stroke="#F7931A"
                    strokeWidth={2.5}
                    dot={{ fill: '#F7931A', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                )}

                {metric === 'transactions' && (
                  <Line
                    type="monotone"
                    dataKey="transactions"
                    name="Transactions"
                    stroke="#00F0FF"
                    strokeWidth={2.5}
                    dot={{ fill: '#00F0FF', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                )}

                {metric === 'in_out' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="in_btc"
                      name="IN (Received BTC)"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={{ fill: '#10B981', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="out_btc"
                      name="OUT (Sent BTC)"
                      stroke="#F43F5E"
                      strokeWidth={2.5}
                      dot={{ fill: '#F43F5E', r: 4 }}
                    />
                  </>
                )}

                {metric === 'cumulative' && (
                  <Line
                    type="monotone"
                    dataKey="cumulative_volume"
                    name="Cumulative Volume (BTC)"
                    stroke="#A855F7"
                    strokeWidth={2.5}
                    dot={{ fill: '#A855F7', r: 4 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
