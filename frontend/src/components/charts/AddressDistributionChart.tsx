import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { formatDecimal, formatInteger } from '../../utils/formatters';

interface AddressDistributionProps {
  data: Array<{
    address: string;
    tx_count: number;
    total_activity_btc: number;
  }>;
  height?: number;
  onSelectAddress?: (addr: string) => void;
}

export const AddressDistributionChart: React.FC<AddressDistributionProps> = ({
  data,
  height = 280,
  onSelectAddress
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 font-mono text-xs">
        No address activity recorded
      </div>
    );
  }

  // Format top 8 addresses
  const chartData = data.slice(0, 8).map((d) => ({
    name: `${d.address.substring(0, 6)}...${d.address.substring(d.address.length - 4)}`,
    fullAddress: d.address,
    tx_count: d.tx_count,
    volume: d.total_activity_btc
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 20, left: 40, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
          <XAxis
            type="number"
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#94A3B8"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            fontFamily="monospace"
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
            formatter={(value: any, name: any) => [
              name === 'tx_count' ? `${formatInteger(value)} transactions` : `${formatDecimal(value, 4)} BTC`,
              name === 'tx_count' ? 'Transactions' : 'Total Activity'
            ]}
          />
          <Bar
            dataKey="tx_count"
            name="tx_count"
            fill="#38BDF8"
            radius={[0, 4, 4, 0]}
            onClick={(entry: any) => {
              if (entry && entry.fullAddress && onSelectAddress) {
                onSelectAddress(entry.fullAddress);
              }
            }}
            cursor="pointer"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
