import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { formatDecimal } from '../../utils/formatters';

interface VolumeChartProps {
  data: Array<{
    name: string;
    volume_btc: number;
    fees_btc?: number;
    timestamp?: number;
  }>;
  height?: number;
}

export const VolumeChart: React.FC<VolumeChartProps> = ({ data, height = 280 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 font-mono text-xs">
        No volume data recorded
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F7931A" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#F7931A" stopOpacity={0.0} />
            </linearGradient>
          </defs>
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
            tickFormatter={(v) => `${formatDecimal(v, 1)} BTC`}
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
            formatter={(value: any) => [`${formatDecimal(value, 4)} BTC`, 'Volume']}
          />
          <Area
            type="monotone"
            dataKey="volume_btc"
            stroke="#F7931A"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#volGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
