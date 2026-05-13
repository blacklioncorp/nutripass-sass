'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import {
  TrendingUp, DollarSign, Building2, Users, Activity,
  ChevronDown, MoreVertical, ExternalLink, Settings, Ban, ShieldCheck, Loader2,
  Percent, PieChart, ArrowUpRight
} from 'lucide-react';
import CreateSchoolModal from '@/components/master/CreateSchoolModal';
import StripeStatusModal from '@/components/master/StripeStatusModal';
import { toggleSchoolStatus, impersonateSchool, updateSchoolCommission } from '@/app/(dashboard)/master/actions';

// ── Shared Types ───────────────────────────────────────────
type School = {
  id: string;
  name: string;
  subdomain: string;
  primary_color: string | null;
  secondary_color: string | null;
  status: string;
  users?: number;
  total_volume?: number;
  net_revenue?: number;
  transaction_count?: number;
  commission_percentage?: number;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  settings?: {
    financial?: {
      min_recharge?: number;
      overdraft_limit?: number;
      apply_convenience_fee?: boolean;
      convenience_fee_amount?: number;
    };
  };
  created_at: string;
};

// ── Helpers ────────────────────────────────────────────────
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(val);
};

// ── Commission Cell (Editable) ─────────────────────────────
function CommissionCell({ schoolId, initialValue }: { schoolId: string; initialValue: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (isNaN(value)) return;
    setLoading(true);
    try {
      await updateSchoolCommission(schoolId, value);
      setIsEditing(false);
    } catch (e: any) {
      alert("Error: " + e.message);
      setValue(initialValue);
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value))}
          className="w-16 p-1 text-xs font-black border border-blue-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          step="0.1"
          min="0"
          max="100"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          onKeyDownCapture={(e) => e.key === 'Escape' && setIsEditing(false)}
        />
        <button
          onClick={handleSave}
          disabled={loading || value === initialValue}
          className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition disabled:opacity-30"
          title="Guardar"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "✔️"}
        </button>
        <button
          onClick={() => { setIsEditing(false); setValue(initialValue); }}
          disabled={loading}
          className="p-1 hover:bg-red-50 text-red-500 rounded transition disabled:opacity-50"
          title="Cancelar"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-xs font-black text-[#2b5fa6] bg-blue-50 px-2.5 py-1.5 rounded-md hover:bg-blue-100 transition cursor-pointer flex items-center gap-1 mx-auto group border border-transparent hover:border-blue-200"
    >
      {Number(initialValue).toFixed(1)}%
      <Settings className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition text-[#7CB9E8]" />
    </button>
  );
}

// ── Min Recharge Cell (Editable JSONB) ─────────────────────
function MinRechargeCell({ schoolId, school }: { schoolId: string; school: School }) {
  const [isEditing, setIsEditing] = useState(false);
  const currentVal = school.settings?.financial?.min_recharge ?? 100;
  const [value, setValue] = useState(currentVal);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (isNaN(value)) return;
    setLoading(true);
    try {
      const newSettings = {
        ...school.settings,
        financial: {
          ...(school.settings?.financial || {}),
          min_recharge: value
        }
      };
      const { updateSchoolSettings } = await import('@/app/(dashboard)/master/actions');
      await updateSchoolSettings(schoolId, newSettings);
      setIsEditing(false);
    } catch (e: any) {
      alert("Error: " + e.message);
      setValue(currentVal);
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value))}
          className="w-20 p-1 text-xs font-black border border-emerald-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          step="10"
          min="0"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          onKeyDownCapture={(e) => e.key === 'Escape' && setIsEditing(false)}
        />
        <button onClick={handleSave} disabled={loading} className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition disabled:opacity-30">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "✔️"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-md hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1 mx-auto group border border-transparent hover:border-emerald-200"
    >
      ${Number(currentVal).toFixed(2)}
      <Settings className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition text-emerald-400" />
    </button>
  );
}

// ── KPI Card ───────────────────────────────────────────────
function KpiCard({
  label, value, trend, trendLabel, icon: Icon, color, subValue
}: {
  label: string; value: string; trend?: number | string; trendLabel: string;
  icon: any; color: string; subValue?: string;
}) {
  const isPositive = typeof trend === 'number' && trend >= 0;
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e8f0f7] shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
        <Icon className="h-24 w-24" style={{ color }} />
      </div>
      
      <div className="flex justify-between items-start relative z-10">
        <p className="text-[#8aa8cc] text-[10px] font-black uppercase tracking-widest">{label}</p>
        <div className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12" style={{ backgroundColor: color + '15' }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>

      <div className="mt-4 relative z-10">
        <p className="text-3xl font-black text-[#0d1f3c] tracking-tight">{value}</p>
        {subValue && <p className="text-[10px] font-bold text-[#8aa8cc] mt-0.5">{subValue}</p>}
        
        <div className={`flex items-center gap-1.5 mt-3 text-[11px] font-bold ${typeof trend === 'string' ? 'text-slate-400' : isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend !== undefined && (
            <>
              <ArrowUpRight className={`h-3.5 w-3.5 ${typeof trend === 'number' && !isPositive ? 'rotate-180' : ''}`} />
              <span>{typeof trend === 'number' ? trend.toFixed(1) : trend}{typeof trend === 'number' ? '%' : ''}</span>
            </>
          )}
          <span className="text-[#8aa8cc] opacity-80">{trendLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ── Actions Menu ───────────────────────────────────────────
function SchoolActionsMenu({ 
  school, 
  onShowStripe 
}: { 
  school: School; 
  onShowStripe: () => void 
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const isSuspended = school.status === 'suspended';

  const handleToggleStatus = async () => {
    setLoading(true);
    try {
      await toggleSchoolStatus(school.id, school.status || 'active');
      setOpen(false);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async () => {
    setLoading(true);
    try {
      await impersonateSchool(school.id);
    } catch (e: any) {
      alert("Error al entrar: " + e.message);
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-xl hover:bg-[#f0f5fb] text-[#8aa8cc] hover:text-[#2b5fa6] transition"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-xl border border-[#e8f0f7] py-1 w-52 overflow-hidden">
            <button 
              onClick={handleImpersonate}
              disabled={loading}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#004B87] font-semibold hover:bg-[#f0f5fb] transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4 text-[#7CB9E8]" />} 
              Entrar al Panel
            </button>
            <button 
              onClick={() => { onShowStripe(); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#004B87] font-semibold hover:bg-[#f0f5fb] transition"
            >
              <Settings className="h-4 w-4 text-[#7CB9E8]" /> Configuración Stripe
            </button>
            <hr className="border-[#e8f0f7] my-1" />
            <button 
              onClick={handleToggleStatus}
              disabled={loading}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50 ${isSuspended ? 'text-emerald-600' : 'text-red-500'}`}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} 
              {isSuspended ? 'Activar Escuela' : 'Suspender Escuela'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Chart Tooltip ──────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0d1f3c] text-white rounded-xl px-4 py-3 shadow-xl text-xs border border-white/10">
      <p className="font-bold text-[#7CB9E8] mb-1">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="opacity-60">Volumen:</span>
          <span className="font-black text-white">{formatCurrency(payload[0]?.value)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="opacity-60">Ingresos:</span>
          <span className="font-black text-[#F4C430]">{formatCurrency(payload[1]?.value)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────
export default function MasterDashboardClient({
  schools,
  usersCount,
  txCount,
  globalVolume,
  globalRevenue,
  avgMargin,
  chartData,
}: {
  schools: School[];
  usersCount: number;
  txCount: number;
  globalVolume: number;
  globalRevenue: number;
  avgMargin: number;
  chartData: any[];
}) {
  const [selectedRange, setSelectedRange] = useState('Este Mes');
  const [selectedStripeSchool, setSelectedStripeSchool] = useState<School | null>(null);

  const activeSchools = schools.filter((s: any) => s.status !== 'suspended').length;

  // Data for the distribution chart (Top 5 schools by revenue)
  const revenueChartData = [...schools]
    .sort((a, b) => (b.net_revenue || 0) - (a.net_revenue || 0))
    .slice(0, 5)
    .map(s => ({
      name: s.name.length > 15 ? s.name.substring(0, 12) + '...' : s.name,
      revenue: s.net_revenue || 0,
      color: s.primary_color || '#7CB9E8'
    }));

  return (
    <div className="space-y-8 pb-12">
      <StripeStatusModal
        isOpen={!!selectedStripeSchool}
        onOpenChange={(o) => !o && setSelectedStripeSchool(null)}
        schoolName={selectedStripeSchool?.name || ''}
        stripeAccountId={selectedStripeSchool?.stripe_account_id || null}
        onboardingComplete={selectedStripeSchool?.stripe_onboarding_complete || false}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#0d1f3c] tracking-tight">Dashboard Maestro</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[#8aa8cc] font-medium text-sm">Resumen financiero global en tiempo real.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              className="flex items-center gap-2 bg-white border border-[#e8f0f7] rounded-xl px-4 py-2.5 text-sm font-bold text-[#0d1f3c] hover:bg-[#f0f5fb] transition shadow-sm"
            >
              <Activity className="h-4 w-4 text-[#7CB9E8]" />
              {selectedRange}
              <ChevronDown className="h-4 w-4 text-[#8aa8cc]" />
            </button>
          </div>
          <CreateSchoolModal />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard 
          label="Volumen Total" 
          value={formatCurrency(globalVolume)} 
          subValue={`${txCount} cargas exitosas`}
          trend={12.5} 
          trendLabel="vs mes pasado" 
          icon={DollarSign} 
          color="#3B82F6" 
        />
        <KpiCard 
          label="Ingresos SafeLunch" 
          value={formatCurrency(globalRevenue)} 
          subValue={`Promedio por colegio: ${formatCurrency(schools.length > 0 ? globalRevenue / schools.length : 0)}`}
          trend={8.2} 
          trendLabel="crecimiento" 
          icon={TrendingUp} 
          color="#F59E0B" 
        />
        <KpiCard 
          label="Margen Promedio" 
          value={`${avgMargin.toFixed(2)}%`} 
          subValue="Consolidado de comisiones"
          trend={0.5} 
          trendLabel="optimización" 
          icon={Percent} 
          color="#10B981" 
        />
        <KpiCard 
          label="Alcance" 
          value={(usersCount || 0).toLocaleString()} 
          subValue={`${activeSchools} colegios operantes`}
          trend={usersCount > 0 ? (activeSchools / (usersCount / 10)) : 0} 
          trendLabel="usuarios activos" 
          icon={Users} 
          color="#8B5CF6" 
        />
      </div>

      {/* Main Insights Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Volume Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e8f0f7] shadow-sm p-7">
          <div className="flex justify-between items-start mb-7">
            <div>
              <h2 className="text-xl font-black text-[#0d1f3c]">Rendimiento de la Plataforma</h2>
              <p className="text-[#8aa8cc] text-xs mt-0.5 font-bold uppercase tracking-widest opacity-70 italic">Último ciclo de 15 días</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5 text-[10px] font-black text-[#8aa8cc]">
                 <div className="h-2 w-2 rounded-full bg-[#7CB9E8]" /> VOLUMEN
               </div>
               <div className="flex items-center gap-1.5 text-[10px] font-black text-[#8aa8cc]">
                 <div className="h-2 w-2 rounded-full bg-[#F4C430]" /> INGRESOS
               </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f5fb" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: '#8aa8cc', fontWeight: 800 }} 
                axisLine={false} 
                tickLine={false} 
                dy={10}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#8aa8cc', fontWeight: 800 }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(val) => `$${val >= 1000 ? (val/1000)+'k' : val}`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="volumen" stroke="#3B82F6" strokeWidth={3} fill="url(#gradVol)" />
              <Area type="monotone" dataKey="ingresos" stroke="#F59E0B" strokeWidth={3} fill="url(#gradRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white rounded-2xl border border-[#e8f0f7] shadow-sm p-7 flex flex-col">
          <div className="mb-6">
            <h2 className="text-xl font-black text-[#0d1f3c]">Ingresos por Colegio</h2>
            <p className="text-[#8aa8cc] text-xs mt-0.5 font-bold uppercase tracking-widest opacity-70">Top 5 Generadores</p>
          </div>
          
          <div className="flex-1 min-h-[250px]">
             {revenueChartData.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-[#8aa8cc] border-2 border-dashed border-[#f0f5fb] rounded-xl">
                 <PieChart className="h-10 w-10 mb-3 opacity-20" />
                 <p className="text-xs font-bold uppercase tracking-widest">Sin datos suficientes</p>
               </div>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={revenueChartData} layout="vertical" margin={{ left: -10, right: 30 }}>
                   <XAxis type="number" hide />
                   <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#1a3a5c' }}
                    axisLine={false}
                    tickLine={false}
                   />
                   <Tooltip 
                     cursor={{ fill: '#f8fafd' }}
                     content={({ active, payload }) => {
                       if (!active || !payload?.length) return null;
                       return (
                         <div className="bg-[#0d1f3c] text-white px-3 py-2 rounded-lg shadow-xl text-xs font-bold">
                           {formatCurrency(payload[0].value as number)}
                         </div>
                       );
                     }}
                   />
                   <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={20}>
                     {revenueChartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.color} />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
             )}
          </div>

          <div className="mt-4 pt-4 border-t border-[#f0f5fb] space-y-3">
             {revenueChartData.map((item, idx) => (
               <div key={idx} className="flex items-center justify-between">
                 <div className="flex items-center gap-2 overflow-hidden">
                   <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                   <span className="text-[11px] font-bold text-[#1a3a5c] truncate">{item.name}</span>
                 </div>
                 <span className="text-[11px] font-black text-[#0d1f3c]">{formatCurrency(item.revenue)}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Schools Table Enhanced */}
      <div className="bg-white rounded-2xl border border-[#e8f0f7] shadow-sm overflow-hidden">
        <div className="px-7 py-6 border-b border-[#f0f5fb] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-[#0d1f3c]">Colegios Registrados</h2>
            <p className="text-[#8aa8cc] text-xs mt-0.5 font-bold uppercase tracking-widest">{schools.length} tenants registrados</p>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-[#f0f5fb] rounded-lg text-[10px] font-black text-[#2b5fa6] uppercase tracking-wider">
            <ShieldCheck className="h-3 w-3" /> Conectado con Stripe Connect
          </div>
        </div>
        <div className="overflow-x-auto">
          {schools.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-[#8aa8cc] font-bold">No hay colegios registrados aún.</p>
              <p className="text-xs text-[#b0c8e0] mt-1">Usa el botón "+ Nueva Escuela" para empezar.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f8fafd] text-[#8aa8cc] text-[10px] font-black uppercase tracking-widest border-b border-[#e8f0f7]">
                  <th className="px-7 py-4">Colegio</th>
                  <th className="px-7 py-4 text-center">Alumnos</th>
                  <th className="px-7 py-4 text-center">Volumen ($)</th>
                  <th className="px-7 py-4 text-center">Comisión (%)</th>
                  <th className="px-7 py-4 text-center">Recarga Mín.</th>
                  <th className="px-7 py-4 text-center">Ganancia SafeLunch</th>
                  <th className="px-7 py-4 text-center">Estado</th>
                  <th className="px-7 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school: School) => {
                  const initials = school.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
                  const totalVolume = school.total_volume || 0;
                  const netRevenue = school.net_revenue || 0;
                  const commPct = school.commission_percentage || 5.00;

                  return (
                    <tr key={school.id} className="border-b border-[#f0f5fb] hover:bg-[#f8fafd] transition group">
                      <td className="px-7 py-5">
                        <div className="flex items-center gap-4">
                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-sm transition-transform group-hover:scale-105"
                            style={{ backgroundColor: school.primary_color || '#7CB9E8' }}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-black text-[#0d1f3c] text-sm">{school.name}</p>
                            <p className="text-[#b0c8e0] text-[11px] font-semibold">{school.subdomain}.safelunch.com</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-7 py-5 text-center">
                        <span className="font-bold text-[#0d1f3c] text-sm bg-[#f0f5fb] px-2 py-1 rounded-md">{school.users || 0}</span>
                      </td>
                      <td className="px-7 py-5 text-center">
                        <span className="font-black text-[#0d1f3c] text-sm">
                          {formatCurrency(totalVolume)}
                        </span>
                        <p className="text-[10px] font-bold text-[#8aa8cc]">{school.transaction_count} txs</p>
                      </td>
                      <td className="px-7 py-5 text-center">
                        <CommissionCell 
                          schoolId={school.id} 
                          initialValue={commPct} 
                        />
                      </td>
                      <td className="px-7 py-5 text-center">
                        <MinRechargeCell 
                          schoolId={school.id} 
                          school={school} 
                        />
                      </td>
                      <td className="px-7 py-5 text-center">
                        <span className="font-black text-[#F59E0B] text-base">
                          {formatCurrency(netRevenue)}
                        </span>
                      </td>
                      <td className="px-7 py-5 text-center">
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          school.status === 'suspended' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {school.status === 'suspended' ? 'Suspendido' : 'Activo'}
                        </span>
                      </td>
                      <td className="px-7 py-5 text-right">
                        <SchoolActionsMenu 
                          school={school} 
                          onShowStripe={() => setSelectedStripeSchool(school)} 
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
