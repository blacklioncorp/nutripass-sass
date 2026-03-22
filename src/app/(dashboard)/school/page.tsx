import { createClient } from '@/utils/supabase/server';

export default async function SchoolDashboardPage() {
  const supabase = await createClient();

  const { count: studentsCount } = await supabase
    .from('consumers')
    .select('*', { count: 'exact', head: true })
    .eq('consumer_type', 'student');

  const { count: staffCount } = await supabase
    .from('consumers')
    .select('*', { count: 'exact', head: true })
    .eq('consumer_type', 'staff');

  const { data: todayTxs } = await supabase
    .from('transactions')
    .select('amount')
    .gte('created_at', new Date().toISOString().split('T')[0]);

  const todaySales = todayTxs?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;

  const kpis = [
    { label: 'ESTUDIANTES', value: studentsCount ?? 842, icon: '👤', color: '#3b82f6' },
    { label: 'PERSONAL', value: staffCount ?? 64, icon: '👤', color: '#f4c430' },
    { label: 'VENTAS HOY', value: `$${todaySales ? todaySales.toLocaleString('es-MX', {minimumFractionDigits:2}) : '8,420.00'}`, icon: '💳', color: '#3b82f6' },
    { label: 'MENÚS SERVIDOS', value: 412, icon: '🍽️', color: '#f4c430' },
  ];

  const weekData = [
    { day: 'Lun', value: 3800 },
    { day: 'Mar', value: 3200 },
    { day: 'Mié', value: 3600 },
    { day: 'Jue', value: 2800 },
    { day: 'Vie', value: 2000 },
  ];
  const maxVal = Math.max(...weekData.map(d => d.value));

  const alerts = [
    { name: 'Juan Pérez', msg: 'Alergia detectada en POS', time: '10:15 AM', color: '#f4c430' },
    { name: 'María García', msg: 'Saldo insuficiente', time: '12:30 PM', color: '#f4c430' },
    { name: 'Sistema', msg: 'Menú del día actualizado', time: '08:00 AM', color: '#f4c430' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[#8aa8cc] font-bold text-xs uppercase tracking-widest mb-1">DASHBOARD</p>
          <h1 className="text-4xl font-black text-[#1a3a5c] tracking-tight">Dashboard de Escuela</h1>
        </div>
        <button className="bg-[#f4c430] hover:bg-[#e6b310] text-[#1a3a5c] font-black px-6 py-3 rounded-xl shadow transition active:scale-95 flex items-center gap-2 text-sm">
          <span>⚡</span>
          ENVIAR RECORDATORIO MATA-MERMAS
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl p-6 border border-[#e8f0f7] shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <p className="text-[#8aa8cc] font-bold text-[10px] uppercase tracking-widest">{kpi.label}</p>
              <span className="text-2xl opacity-40">{kpi.icon}</span>
            </div>
            <p className="text-4xl font-black text-[#1a3a5c] mt-2 tracking-tight">{kpi.value}</p>
            <p className="text-[#3b82f6] text-xs font-bold mt-2 flex items-center gap-1">
              <span>↑</span> +12% DESDE AYER
            </p>
          </div>
        ))}
      </div>

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Weekly Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e8f0f7] shadow-sm p-8">
          <h2 className="text-[#1a3a5c] font-black text-xl mb-8">Consumo Semanal</h2>
          <div className="relative h-56">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between pr-2 text-[#8aa8cc] text-xs font-semibold">
              {['4000', '3000', '2000', '1000', '0'].map(v => (
                <span key={v}>{v}</span>
              ))}
            </div>
            {/* Chart area */}
            <div className="absolute left-8 right-0 top-0 bottom-8">
              {/* Grid lines */}
              {[0,25,50,75,100].map(p => (
                <div key={p} className="absolute w-full border-t border-[#e8f0f7]" style={{ top: `${p}%` }} />
              ))}
              {/* Area chart SVG */}
              <svg className="w-full h-full" viewBox="0 0 400 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02"/>
                  </linearGradient>
                </defs>
                {(() => {
                  const pts = weekData.map((d, i) => ({
                    x: (i / (weekData.length - 1)) * 380 + 10,
                    y: 10 + ((maxVal - d.value) / maxVal) * 160
                  }));
                  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
                  const area = `${pts[0].x},170 ` + polyline + ` ${pts[pts.length-1].x},170`;
                  return (
                    <>
                      <polygon points={area} fill="url(#areaGrad)" />
                      <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" />
                      {pts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#3b82f6" />
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
            {/* X-axis labels */}
            <div className="absolute left-8 right-0 bottom-0 flex justify-between text-[#8aa8cc] text-xs font-semibold">
              {weekData.map(d => <span key={d.day}>{d.day}</span>)}
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl border border-[#e8f0f7] shadow-sm p-8">
          <div className="flex items-center gap-2 text-[#3b82f6] mb-6">
            <span className="text-lg">ℹ️</span>
            <h2 className="text-[#1a3a5c] font-black text-xl">Alertas de Nutrición</h2>
          </div>
          <div className="space-y-4">
            {alerts.map((alert, i) => (
              <div key={i} className="flex gap-4 items-start p-3 rounded-xl hover:bg-[#f0f5fb] transition cursor-pointer">
                <div className="mt-1 h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: alert.color }} />
                <div>
                  <p className="text-[#1a3a5c] font-black text-sm leading-none">{alert.name}</p>
                  <p className="text-[#8aa8cc] text-xs font-medium mt-1">{alert.msg}</p>
                  <p className="text-[#3b82f6] text-[10px] font-bold mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
