import React, { useState } from 'react';
import { Search, Clock, Menu, Database, Zap } from 'lucide-react';
import { useRealtime } from '../../context/useRealtime';
import { api } from '../../api/client';

interface TopBarProps {
  onToggleMobileMenu: () => void;
  onNavigateTo: (type: 'block' | 'address' | 'transaction', id: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMobileMenu, onNavigateTo }) => {
  const { isConnected, latestBlock, lastUpdated } = useRealtime();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const res = await api.search(q);
      setSearchQuery('');
      if (res.type === 'transaction' && res.block_height) {
        onNavigateTo('block', res.block_height.toString());
      } else {
        onNavigateTo(res.type, res.id);
      }
    } catch {
      setSearchError('Not found in analyzed window');
      setTimeout(() => setSearchError(null), 3000);
    } finally {
      setIsSearching(false);
    }
  };

  // Format UTC time
  const utcHours = lastUpdated.getUTCHours().toString().padStart(2, '0');
  const utcMinutes = lastUpdated.getUTCMinutes().toString().padStart(2, '0');
  const utcSeconds = lastUpdated.getUTCSeconds().toString().padStart(2, '0');
  const utcTimeStr = `${utcHours}:${utcMinutes}:${utcSeconds} UTC`;

  return (
    <header className="h-16 px-4 lg:px-6 bg-dark-900/90 border-b border-dark-700/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Left: Mobile Menu & Live Indicator */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Live Status Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-dark-950 border border-dark-700/60 shadow-inner">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-intel-emerald animate-ping' : 'bg-intel-rose'}`} />
          <span className="text-xs font-mono font-bold tracking-wider text-slate-200">
            {isConnected ? 'LIVE' : 'RECONNECTING'}
          </span>
        </div>

        {/* Latest Block Indicator */}
        {latestBlock && (
          <div
            onClick={() => onNavigateTo('block', latestBlock.height.toString())}
            className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-btc-primary/10 border border-btc-primary/30 text-btc-primary hover:bg-btc-primary/20 cursor-pointer transition-colors"
          >
            <Zap className="w-3.5 h-3.5 fill-btc-primary" />
            <span className="text-xs font-mono font-bold">
              Tip #{latestBlock.height}
            </span>
          </div>
        )}
      </div>

      {/* Center: Global Search Bar */}
      <div className="flex-1 max-w-xl mx-4">
        <form onSubmit={handleSearch} className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search block height, hash, txid, or address (1..., 3..., bc1...)"
            className="w-full pl-10 pr-24 py-1.5 bg-dark-950/80 border border-dark-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-intel-cyan/80 focus:ring-1 focus:ring-intel-cyan/40 transition-all font-mono"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-0.5 rounded text-[11px] font-medium bg-dark-800 hover:bg-dark-750 text-slate-300 border border-dark-700 transition-colors"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          {searchError && (
            <div className="absolute top-full left-0 mt-1 text-[11px] text-intel-rose font-medium bg-dark-900 px-2 py-1 rounded border border-intel-rose/30 shadow-lg">
              {searchError}
            </div>
          )}
        </form>
      </div>

      {/* Right: Real Blockchain Timestamp & Source */}
      <div className="flex items-center gap-3">
        <div className="hidden md:flex flex-col items-end text-right">
          <div className="flex items-center gap-1.5 text-xs text-slate-200 font-mono">
            <Clock className="w-3.5 h-3.5 text-intel-cyan" />
            <span>{utcTimeStr}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Real Blockchain Time
          </span>
        </div>

        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded bg-dark-950 border border-dark-700/60 text-[11px] text-slate-400 font-mono">
          <Database className="w-3.5 h-3.5 text-btc-primary" />
          <span>mempool.space</span>
        </div>
      </div>
    </header>
  );
};
