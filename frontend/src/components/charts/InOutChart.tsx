import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { formatDecimal } from '../../utils/formatters';

interface InOutChartProps {
  data: Array<{
    name: string;
    incoming: number;
    outgoing: number;
  }>;
  height?: number;
}

export const InOutChart: React.FC<InOutChartProps> = ({ data, height = 280 }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 font-mono text-xs">
        No IN/OUT flow recorded
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
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
            tickFormatter={(v) => formatDecimal(v, 1)}
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
            formatter={(value: any, name: any) => [`${formatDecimal(value, 4)} BTC`, name === 'incoming' ? 'Incoming (IN)' : 'Outgoing (OUT)']}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontFamily: 'monospace' }}
          />
          <Bar dataKey="incoming" name="IN (Received)" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={30} />
          <Bar dataKey="outgoing" name="OUT (Sent)" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
