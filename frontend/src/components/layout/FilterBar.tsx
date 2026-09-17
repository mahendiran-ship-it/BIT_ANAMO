import React, { useState } from 'react';
import { Filter, RotateCcw, Check } from 'lucide-react';

export interface FilterState {
  timeWindow: string; // 'all' | '1h' | '24h' | '10d'
  minTxCount: string; // 'all' | '500' | '1000' | '2000'
  minAmountBtc: string; // 'all' | '1' | '10' | '100'
  direction: string; // 'ALL' | 'IN' | 'OUT'
  addressActivity: string; // 'all' | 'active_5' | 'active_10'
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onReset: () => void;
  showDirection?: boolean;
  showAddressActivity?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  showDirection = true,
  showAddressActivity: _showAddressActivity = true
}) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [tempFilters, setTempFilters] = useState<FilterState>(filters);

  const handleChange = (key: keyof FilterState, val: string) => {
    setTempFilters(prev => ({ ...prev, [key]: val }));
  };

  const applyFilters = () => {
    onFilterChange(tempFilters);
    setIsOpenMobile(false);
  };

  const handleReset = () => {
    const defaultFilters: FilterState = {
      timeWindow: '10d',
      minTxCount: 'all',
      minAmountBtc: 'all',
      direction: 'ALL',
      addressActivity: 'all'
    };
    setTempFilters(defaultFilters);
    onFilterChange(defaultFilters);
    onReset();
  };

  const isFiltered =
    tempFilters.timeWindow !== '10d' ||
    tempFilters.minTxCount !== 'all' ||
    tempFilters.minAmountBtc !== 'all' ||
    tempFilters.direction !== 'ALL' ||
    tempFilters.addressActivity !== 'all';

  return (
    <div className="w-full bg-dark-900 border border-dark-700/80 rounded-xl p-3 shadow-card mb-6">
      {/* Mobile Trigger Button */}
      <div className="lg:hidden flex items-center justify-between">
        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800 text-slate-200 border border-dark-700 text-xs font-medium"
        >
          <Filter className="w-3.5 h-3.5 text-intel-cyan" />
          <span>Filters</span>
          {isFiltered && <span className="w-2 h-2 rounded-full bg-btc-primary" />}
        </button>
        {isFiltered && (
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      {/* Filter Controls Bar (Desktop + Expanded Mobile) */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:flex items-center gap-3 pt-3 lg:pt-0 ${isOpenMobile ? 'block' : 'hidden lg:flex'}`}>
        <div className="hidden lg:flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase tracking-wider pl-1 pr-2 border-r border-dark-700/60">
          <Filter className="w-3.5 h-3.5 text-intel-cyan" />
          <span>Filters</span>
        </div>

        {/* Time Window */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Time Window</label>
          <select
            value={tempFilters.timeWindow}
            onChange={(e) => handleChange('timeWindow', e.target.value)}
            className="bg-dark-950 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-intel-cyan"
          >
            <option value="10d">10-Day Window</option>
            <option value="24h">Last 24 Hours</option>
            <option value="1h">Last 1 Hour</option>
            <option value="all">All Available</option>
          </select>
        </div>

        {/* Min TX Count */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Min Block TXs</label>
          <select
            value={tempFilters.minTxCount}
            onChange={(e) => handleChange('minTxCount', e.target.value)}
            className="bg-dark-950 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-intel-cyan"
          >
            <option value="all">Any Count</option>
            <option value="500">&gt; 500 TXs</option>
            <option value="1000">&gt; 1,000 TXs</option>
            <option value="2000">&gt; 2,000 TXs</option>
          </select>
        </div>

        {/* Min Amount BTC */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Threshold (BTC)</label>
          <select
            value={tempFilters.minAmountBtc}
            onChange={(e) => handleChange('minAmountBtc', e.target.value)}
            className="bg-dark-950 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-intel-cyan"
          >
            <option value="all">Any Amount</option>
            <option value="1">&gt; 1.0 BTC</option>
            <option value="10">&gt; 10.0 BTC</option>
            <option value="100">&gt; 100.0 BTC</option>
          </select>
        </div>

        {/* Direction Filter */}
        {showDirection && (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400">Direction</label>
            <select
              value={tempFilters.direction}
              onChange={(e) => handleChange('direction', e.target.value)}
              className="bg-dark-950 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-intel-cyan"
            >
              <option value="ALL">All Flows</option>
              <option value="IN">Incoming (IN)</option>
              <option value="OUT">Outgoing (OUT)</option>
            </select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-4 lg:pt-4 ml-auto">
          <button
            onClick={applyFilters}
            className="px-4 py-1.5 rounded-lg bg-btc-primary hover:bg-btc-hover text-white text-xs font-bold transition-all shadow-glow-btc/30 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply</span>
          </button>

          {isFiltered && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-750 text-slate-300 border border-dark-700 text-xs font-medium transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
