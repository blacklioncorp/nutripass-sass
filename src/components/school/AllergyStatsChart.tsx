'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface AllergyStatsChartProps {
  data: {
    name: string;
    count: number;
  }[];
}

const COLORS = ['#ef4444', '#f97316', '#facc15', '#4ade80', '#60a5fa'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a3a5c] border border-white/10 p-4 rounded-2xl shadow-2xl">
        <p className="text-[#8aa8cc] text-[10px] font-black uppercase tracking-widest mb-1">{label}</p>
        <p className="text-white font-black text-xl">
          {payload[0].value} {payload[0].value === 1 ? 'Alumno' : 'Alumnos'}
        </p>
      </div>
    );
  }
  return null;
};

export default function AllergyStatsChart({ data }: AllergyStatsChartProps) {
  return (
    <div className="w-full h-full min-h-[300px]">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-black text-[#1a3a5c] tracking-tight">Monitor de Alergias</h2>
          <p className="text-[#8aa8cc] text-[10px] font-bold uppercase tracking-widest mt-1">Top 5 Alergias más Frecuentes en el Plantel</p>
        </div>
        <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center text-xl shadow-inner">
            🚨
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f5fb" />
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#1a3a5c', fontSize: 10, fontWeight: 900 }}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc', radius: 10}} />
            <Bar
              dataKey="count"
              radius={[0, 10, 10, 0]}
              barSize={24}
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex flex-wrap gap-4">
          {data.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.name}</span>
              </div>
          ))}
      </div>
    </div>
  );
}
