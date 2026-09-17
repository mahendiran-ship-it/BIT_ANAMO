import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  tooltip?: string;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  iconColor = 'text-intel-cyan',
  trend,
  tooltip,
  highlight = false
}) => {
  return (
    <div
      className={`intel-card p-4 relative overflow-hidden transition-all duration-200
        ${highlight ? 'border-btc-primary/40 bg-gradient-to-br from-dark-900 via-dark-900 to-btc-muted/20 shadow-glow-btc/10' : ''}
      `}
      title={tooltip}
    >
      <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-2">
        <span className="uppercase tracking-wider font-medium truncate pr-2">{label}</span>
        {Icon && (
          <div className={`p-1.5 rounded-lg bg-dark-950/80 border border-dark-700/50 ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-xl lg:text-2xl font-bold font-mono tracking-tight text-white truncate">
          {value}
        </span>
        {subValue && (
          <span className="text-xs font-mono text-slate-400 truncate">
            {subValue}
          </span>
        )}
      </div>

      {trend && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-mono">
          <span className={trend.isPositive ? 'text-intel-emerald font-semibold' : 'text-intel-rose font-semibold'}>
            {trend.value}
          </span>
          <span className="text-[11px] text-slate-400">vs prev period</span>
        </div>
      )}
    </div>
  );
};
