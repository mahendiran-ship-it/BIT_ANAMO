import React, { useState } from 'react';
import { Compass, Search, Boxes, Wallet, GitCommit, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../api/client';

interface ExplorerPageProps {
  onNavigateTo: (type: 'block' | 'address' | 'transaction', id: string) => void;
}

export const ExplorerPage: React.FC<ExplorerPageProps> = ({ onNavigateTo }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.search(q);
      if (res.type === 'transaction' && res.block_height) {
        onNavigateTo('block', res.block_height.toString());
      } else {
        onNavigateTo(res.type, res.id);
      }
    } catch {
      setError('No matching record found in analyzed blockchain data. Verify format or try another query.');
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    { label: 'Block Tip', value: 'latest', type: 'block' },
    { label: 'Sample Active Address', value: 'bc1phj3nvfystppn2px9zrgdfv42j0f9zasu8gv7ak4zknkurwnkmjms7whlx4', type: 'address' },
    { label: 'Sample Hash', value: '000000000000000000020cf91fe0d64930dfe0d1fa2a87b7528d1ec65093b154', type: 'block' }
  ];

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center py-6 border-b border-dark-700/60">
        <div className="w-12 h-12 rounded-2xl bg-intel-cyan/15 border border-intel-cyan/30 flex items-center justify-center mx-auto mb-3 text-intel-cyan">
          <Compass className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold font-mono text-white tracking-wide">
          BITCOIN BLOCKCHAIN EXPLORER
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Unified query portal for blocks, transaction IDs, and addresses across the 10-day intelligence window
        </p>
      </div>

      {/* Main Search Bar Card */}
      <div className="intel-card p-6 shadow-2xl">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Block Height (e.g. 966844), Block Hash, TXID, or Address..."
              className="w-full pl-12 pr-28 py-3.5 bg-dark-950 border border-dark-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-intel-cyan focus:ring-1 focus:ring-intel-cyan shadow-inner"
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-lg bg-btc-primary hover:bg-btc-hover text-white text-xs font-mono font-bold transition-all shadow-glow-btc/30 flex items-center gap-1.5"
            >
              <span>{loading ? 'Searching...' : 'Explore'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-intel-rose/15 border border-intel-rose/30 text-xs font-mono text-intel-rose">
              {error}
            </div>
          )}

          {/* Sample Query Chips */}
          <div className="pt-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
              Quick Test Inquiries (One-Click Demo):
            </span>
            <div className="flex flex-wrap gap-2">
              {sampleQueries.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setQuery(s.value);
                    onNavigateTo(s.type as any, s.value);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-dark-850 hover:bg-dark-800 border border-dark-700/60 text-xs font-mono text-slate-300 hover:text-intel-cyan transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-btc-primary" />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Explorer Intelligence Capabilities Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="intel-card p-4">
          <div className="flex items-center gap-2 text-btc-primary font-mono font-bold text-xs mb-2">
            <Boxes className="w-4 h-4" />
            <span>Block Lookup</span>
          </div>
          <p className="text-xs font-mono text-slate-400 leading-relaxed">
            Enter integer block height or 64-char block hash to inspect analyzed metrics, input/output UTXOs, and fees.
          </p>
        </div>

        <div className="intel-card p-4">
          <div className="flex items-center gap-2 text-intel-cyan font-mono font-bold text-xs mb-2">
            <Wallet className="w-4 h-4" />
            <span>Address Dossier</span>
          </div>
          <p className="text-xs font-mono text-slate-400 leading-relaxed">
            Search any standard Bitcoin address (P2PKH, P2SH, SegWit, Taproot) to check activity, total IN/OUT flow, and click Follow.
          </p>
        </div>

        <div className="intel-card p-4">
          <div className="flex items-center gap-2 text-intel-blue font-mono font-bold text-xs mb-2">
            <GitCommit className="w-4 h-4" />
            <span>Transaction Tracking</span>
          </div>
          <p className="text-xs font-mono text-slate-400 leading-relaxed">
            Trace transaction outputs, miner fees, and input addresses for any transaction analyzed in our rolling window.
          </p>
        </div>
      </div>
    </div>
  );
};
