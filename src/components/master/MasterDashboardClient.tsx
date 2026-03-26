'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, DollarSign, Building2, Users, Activity,
  ChevronDown, MoreVertical, ExternalLink, Settings, Ban, ShieldCheck, Loader2
} from 'lucide-react';
import CreateSchoolModal from '@/components/master/CreateSchoolModal';
import StripeStatusModal from '@/components/master/StripeStatusModal';
import { toggleSchoolStatus, impersonateSchool } from '@/app/(dashboard)/master/actions';

// ── Shared Types ───────────────────────────────────────────
type School = {
  id: string;
  name: string;
  subdomain: string;
  primary_color: string | null;
  secondary_color: string | null;
  status: string;
  users?: number;
  monthly_volume?: number;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  created_at: string;
};

// ── Chart Helper ───────────────────────────────────────────
const generateEmptyChartData = () => {
  return Array.from({ length: 15 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (14 - i));
    return {
      date: date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
      volumen: 0,
      ingresos: 0,
    };
  });
};

const CHART_DATA = generateEmptyChartData();

// ── KPI Card ───────────────────────────────────────────────
function KpiCard({
  label, value, trend, trendLabel, icon: Icon, color,
}: {
  label: string; value: string; trend: number | string; trendLabel: string;
  icon: any; color: string;
}) {
  const isPositive = typeof trend === 'number' && trend >= 0;
  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e8f0f7] shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <p className="text-[#8aa8cc] text-xs font-black uppercase tracking-widest">{label}</p>
        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-4xl font-black text-[#0d1f3c] tracking-tight">{value}</p>
        <div className={`flex items-center gap-1.5 mt-2 text-xs font-bold ${typeof trend === 'string' ? 'text-slate-400' : isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          <TrendingUp className={`h-3.5 w-3.5 ${typeof trend === 'number' && !isPositive ? 'rotate-180' : ''}`} />
          <span>{trend}{typeof trend === 'number' ? '%' : ''} {trendLabel}</span>
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
    <div className="bg-[#0d1f3c] text-white rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="font-bold text-[#7CB9E8] mb-1">{label}</p>
      <p>Volumen: <span className="font-black">${payload[0]?.value?.toLocaleString()}</span></p>
      <p>Ingresos: <span className="font-black text-[#F4C430]">${payload[1]?.value?.toLocaleString()}</span></p>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────
export default function MasterDashboardPage({
  schools: initialSchools,
  usersCount,
  txCount,
}: {
  schools: any[];
  usersCount: number;
  txCount: number;
}) {
  const [selectedRange, setSelectedRange] = useState('Este Mes');
  const [openRange, setOpenRange] = useState(false);
  const [selectedStripeSchool, setSelectedStripeSchool] = useState<School | null>(null);

  // If no schools in DB, it starts empty. No more MOCK_SCHOOLS hardcoded.
  const schools = initialSchools || [];

  const grossVolume = schools.reduce((s: number, sc: any) => s + (sc.monthly_volume || 0), 0);
  const netRevenue = Math.round(grossVolume * 0.10);
  const activeSchools = schools.filter((s: any) => s.status !== 'suspended').length;

  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:9002';

  return (
    <div className="space-y-8">
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
          <p className="text-[#8aa8cc] font-medium mt-1">Resumen global de la plataforma NutriPass.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setOpenRange(o => !o)}
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard label="Volumen Procesado" value={`$${grossVolume.toLocaleString()}`} trend={0} trendLabel="tiempo real" icon={DollarSign} color="#7CB9E8" />
        <KpiCard label="Ingresos NutriPass" value={`$${netRevenue.toLocaleString()}`} trend={0} trendLabel="tiempo real" icon={TrendingUp} color="#F4C430" />
        <KpiCard label="Escuelas Activas" value={String(activeSchools)} trend={activeSchools} trendLabel="registradas" icon={Building2} color="#22c55e" />
        <KpiCard label="Usuarios Totales" value={(usersCount || 0).toLocaleString()} trend="0" trendLabel="vinculados" icon={Users} color="#a855f7" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e8f0f7] shadow-sm p-7">
          <div className="flex justify-between items-start mb-7">
            <div>
              <h2 className="text-xl font-black text-[#0d1f3c]">Volumen de Transacciones</h2>
              <p className="text-[#8aa8cc] text-sm mt-0.5">Datos agregados de todos los colegios.</p>
            </div>
            <div className="flex gap-4 text-xs font-bold text-[#8aa8cc]">
              <span>Real-time Sync</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={CHART_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7CB9E8" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#7CB9E8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f5fb" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8aa8cc', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8aa8cc', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="volumen" stroke="#7CB9E8" strokeWidth={2} fill="url(#gradVol)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-2xl border border-[#e8f0f7] shadow-sm p-7">
          <h2 className="text-xl font-black text-[#0d1f3c] mb-5">Actividad Reciente</h2>
          {schools.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-[#8aa8cc]">
              <span className="text-4xl mb-3">📡</span>
              <p className="text-sm font-bold uppercase tracking-widest">Esperando señales...</p>
            </div>
          ) : (
            <p className="text-[#8aa8cc] text-sm text-center py-12 italic">Monitoreando transacciones en vivo...</p>
          )}
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white rounded-2xl border border-[#e8f0f7] shadow-sm overflow-hidden">
        <div className="px-7 py-5 border-b border-[#f0f5fb]">
          <h2 className="text-xl font-black text-[#0d1f3c]">Colegios Registrados</h2>
          <p className="text-[#8aa8cc] text-sm mt-0.5">{schools.length} tenants activos</p>
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
                <tr className="bg-[#f0f5fb] text-[#8aa8cc] text-[11px] font-black uppercase tracking-widest border-b border-[#e8f0f7]">
                  <th className="px-7 py-4">Colegio</th>
                  <th className="px-7 py-4">Estado</th>
                  <th className="px-7 py-4 text-center">Usuarios</th>
                  <th className="px-7 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school: School) => {
                  const initials = school.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
                  return (
                    <tr key={school.id} className="border-b border-[#f0f5fb] hover:bg-[#f8fafd] transition">
                      <td className="px-7 py-5">
                        <div className="flex items-center gap-4">
                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-sm"
                            style={{ backgroundColor: school.primary_color || '#7CB9E8' }}
                          >
                            {initials}
                          </div>
                          <div>
                            <p className="font-black text-[#0d1f3c] text-sm">{school.name}</p>
                            <p className="text-[#b0c8e0] text-xs font-medium">{school.subdomain}.nutripass.com</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-7 py-5">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-black ${
                          school.status === 'suspended' 
                            ? 'bg-red-100 text-red-700' 
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {school.status === 'suspended' ? 'Suspendido' : 'Activo'}
                        </span>
                      </td>
                      <td className="px-7 py-5 text-center">
                        <span className="font-black text-[#0d1f3c] text-base">{school.users || 0}</span>
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
