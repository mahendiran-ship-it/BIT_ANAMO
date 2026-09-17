import React from 'react';
import { Settings, Database, Bot, Server } from 'lucide-react';
import { useRealtime } from '../context/useRealtime';
import { Badge } from '../components/ui/Badge';
import { formatInteger } from '../utils/formatters';

export const SettingsPage: React.FC = () => {
  const { health } = useRealtime();

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-700/60 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide font-mono flex items-center gap-2">
            <Settings className="w-5 h-5 text-btc-primary" />
            PLATFORM CONFIGURATION & SYSTEM TELEMETRY
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Environment variables, data provider ingestion parameters, and storage metrics
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Data Ingestion Settings */}
        <div className="intel-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-dark-700/60 pb-3">
            <Server className="w-4 h-4 text-intel-cyan" />
            <h2 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              Data Ingestion Parameters
            </h2>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between items-center py-1 border-b border-dark-700/40">
              <span className="text-slate-400">Data Provider:</span>
              <span className="text-btc-primary font-bold">{health?.data_provider || 'mempool.space'}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-dark-700/40">
              <span className="text-slate-400">Max TXs / Block:</span>
              <span className="text-white font-bold">{health?.max_transactions_per_block || 1000} (Configurable)</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-dark-700/40">
              <span className="text-slate-400">Detection Mechanism:</span>
              <span className="text-intel-emerald font-semibold">WebSocket + Polling ({health?.poll_interval_seconds || 20}s)</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Rolling Analysis Window:</span>
              <span className="text-intel-cyan font-bold">{health?.rolling_window_days || 10} Days</span>
            </div>
          </div>
        </div>

        {/* Database Telemetry */}
        <div className="intel-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-dark-700/60 pb-3">
            <Database className="w-4 h-4 text-btc-primary" />
            <h2 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              Database Telemetry
            </h2>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between items-center py-1 border-b border-dark-700/40">
              <span className="text-slate-400">Database Engine:</span>
              <span className="text-white font-bold">SQLite 3 (WAL mode)</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-dark-700/40">
              <span className="text-slate-400">Blocks Ingested:</span>
              <span className="text-intel-cyan font-bold">{formatInteger(health?.database?.total_blocks_ingested)}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-dark-700/40">
              <span className="text-slate-400">Transactions Indexed:</span>
              <span className="text-intel-cyan font-bold">{formatInteger(health?.database?.total_transactions_indexed)}</span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-dark-700/40">
              <span className="text-slate-400">Followed Addresses:</span>
              <span className="text-intel-emerald font-bold">{formatInteger(health?.database?.followed_addresses_count)}</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Detection Events:</span>
              <span className="text-intel-amber font-bold">{formatInteger(health?.database?.follow_up_events_count)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Integration Interface Card */}
      <div className="intel-card p-6 border-intel-cyan/40">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-intel-cyan/15 border border-intel-cyan/30 text-intel-cyan">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wide">
                AI Service Interface (Gemini / Qwen Abstraction)
              </h3>
              <Badge variant="cyan" size="sm">Ready for API Keys</Badge>
            </div>
            <p className="text-xs font-mono text-slate-300 mt-2 leading-relaxed">
              The AI service interface is fully abstracted in <code className="text-btc-primary font-bold">app/services/ai_service.py</code>. To activate automated natural language summaries, configure <code className="text-btc-primary font-bold">GEMINI_API_KEY</code> or <code className="text-btc-primary font-bold">QWEN_API_KEY</code> in the backend <code className="text-white">.env</code> file. No frontend or schema changes are needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
