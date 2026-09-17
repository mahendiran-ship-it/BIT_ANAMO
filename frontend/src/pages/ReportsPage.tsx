import React, { useState } from 'react';
import { FileSpreadsheet, Download, CheckCircle2, Boxes, Wallet } from 'lucide-react';
import { api } from '../api/client';
import { useRealtime } from '../context/useRealtime';

export const ReportsPage: React.FC = () => {
  const { latestBlock } = useRealtime();
  const [reportType, setReportType] = useState<'block' | 'address'>('block');
  const [targetId, setTargetId] = useState<string>('');
  const [format, setFormat] = useState<'json' | 'csv' | 'html'>('json');

  const handleDownload = () => {
    const url = api.getReportDownloadUrl(reportType, targetId.trim(), format);
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-700/60 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide font-mono flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-btc-primary" />
            INTELLIGENCE REPORT GENERATOR
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Export analyzed Bitcoin telemetry, transaction breakdowns, and address dossiers in industry formats
          </p>
        </div>
      </div>

      {/* Report Configuration Card */}
      <div className="intel-card p-6 shadow-card space-y-6">
        {/* Step 1: Select Subject */}
        <div>
          <label className="text-xs font-mono font-bold text-white uppercase tracking-wider block mb-3">
            1. Select Report Target
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setReportType('block');
                setTargetId(latestBlock?.height?.toString() || '');
              }}
              className={`p-4 rounded-xl border text-left font-mono transition-all flex items-start gap-3 ${
                reportType === 'block'
                  ? 'bg-btc-primary/15 border-btc-primary/50 text-white shadow-sm'
                  : 'bg-dark-950 border-dark-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <Boxes className={`w-5 h-5 mt-0.5 ${reportType === 'block' ? 'text-btc-primary' : 'text-slate-400'}`} />
              <div>
                <strong className="text-sm block text-white">Block Intelligence Report</strong>
                <span className="text-xs text-slate-400">Complete summary, UTXO volume, analyzed transaction sample, fees</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setReportType('address');
                setTargetId('bc1phj3nvfystppn2px9zrgdfv42j0f9zasu8gv7ak4zknkurwnkmjms7whlx4');
              }}
              className={`p-4 rounded-xl border text-left font-mono transition-all flex items-start gap-3 ${
                reportType === 'address'
                  ? 'bg-intel-cyan/15 border-intel-cyan/50 text-white shadow-sm'
                  : 'bg-dark-950 border-dark-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              <Wallet className={`w-5 h-5 mt-0.5 ${reportType === 'address' ? 'text-intel-cyan' : 'text-slate-400'}`} />
              <div>
                <strong className="text-sm block text-white">Address Dossier Report</strong>
                <span className="text-xs text-slate-400">First/last seen blocks, total IN/OUT flow, monitoring detection events</span>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Target Identifier */}
        <div>
          <label className="text-xs font-mono font-bold text-white uppercase tracking-wider block mb-2">
            2. Enter {reportType === 'block' ? 'Block Height or Hash' : 'Bitcoin Address'}
          </label>
          <input
            type="text"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full px-4 py-2.5 bg-dark-950 border border-dark-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-intel-cyan"
            placeholder={reportType === 'block' ? 'e.g. 966844' : 'e.g. bc1q...'}
          />
        </div>

        {/* Step 3: Format */}
        <div>
          <label className="text-xs font-mono font-bold text-white uppercase tracking-wider block mb-2">
            3. Select Export Format
          </label>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'json', label: 'Structured JSON', desc: 'Raw machine-readable intelligence' },
              { id: 'csv', label: 'CSV Spreadsheet', desc: 'Comma-separated values for Excel' },
              { id: 'html', label: 'Printable HTML / PDF', desc: 'Judge-ready stylized dossier' }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id as any)}
                className={`flex-1 min-w-[140px] p-3 rounded-lg border text-left font-mono transition-colors ${
                  format === f.id
                    ? 'bg-dark-800 border-intel-cyan text-white shadow-sm'
                    : 'bg-dark-950 border-dark-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase">{f.label}</span>
                  {format === f.id && <CheckCircle2 className="w-3.5 h-3.5 text-intel-cyan" />}
                </div>
                <span className="text-[11px] text-slate-500 block mt-1">{f.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-dark-700/60">
          <button
            onClick={handleDownload}
            disabled={!targetId.trim()}
            className="w-full py-3 rounded-xl bg-btc-primary hover:bg-btc-hover disabled:opacity-50 text-white font-mono font-bold text-sm transition-all shadow-glow-btc/30 flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download {format.toUpperCase()} Report</span>
          </button>
        </div>
      </div>
    </div>
  );
};
