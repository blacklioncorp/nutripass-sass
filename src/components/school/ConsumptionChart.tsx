'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ConsumptionChartProps {
  data: {
    date: string;
    sales: number;
  }[];
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(val);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a3a5c] border border-white/10 p-4 rounded-2xl shadow-2xl">
        <p className="text-[#8aa8cc] text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <p className="text-white font-black text-xl">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export default function ConsumptionChart({ data }: ConsumptionChartProps) {
  return (
    <div className="w-full h-full min-h-[300px]">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h2 className="text-2xl font-black text-[#1a3a5c] tracking-tight">Tendencia de Ventas</h2>
          <p className="text-[#8aa8cc] text-[10px] font-bold uppercase tracking-widest mt-1">Ingresos por día ($ MXN)</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-[#1a3a5c] uppercase tracking-widest">En Vivo</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="80%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#f0f5fb" 
          />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8aa8cc', fontSize: 10, fontWeight: 700 }}
            dy={15}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8aa8cc', fontSize: 10, fontWeight: 700 }}
            tickFormatter={(val) => `$${val >= 1000 ? (val/1000)+'k' : val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="#10b981"
            strokeWidth={4}
            fillOpacity={1}
            fill="url(#colorSales)"
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
