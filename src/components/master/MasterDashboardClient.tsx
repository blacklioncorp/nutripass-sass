'use client';

import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, DollarSign, Building2, Users, Activity,
  ChevronDown, MoreVertical, ExternalLink, Settings, Ban, Plus
} from 'lucide-react';
import CreateSchoolModal from '@/components/master/CreateSchoolModal';

// ── Mock Data ──────────────────────────────────────────────
const CHART_DATA = Array.from({ length: 15 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (14 - i));
  return {
    date: date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
    volumen: Math.floor(Math.random() * 45000 + 15000),
    ingresos: Math.floor(Math.random() * 4500 + 1500),
  };
});

const MOCK_SCHOOLS = [
  {
    id: '1',
    name: 'Liceo Sakbe',
    subdomain: 'licesakbe',
    primary_color: '#7CB9E8',
    secondary_color: '#004B87',
    status: 'active',
    users: 312,
    monthly_volume: 148200,
    created_at: '2026-03-22',
    stripe_onboarding_complete: true,
  },
  {
    id: '2',
    name: 'Sakbe',
    subdomain: 'sakbe',
    primary_color: '#7CB9E8',
    secondary_color: '#F4C430',
    status: 'active',
    users: 530,
    monthly_volume: 267500,
    created_at: '2026-03-22',
    stripe_onboarding_complete: true,
  },
  {
    id: '3',
    name: 'Instituto Cumbres',
    subdomain: 'cumbres',
    primary_color: '#22C55E',
    secondary_color: '#15803d',
    status: 'onboarding',
    users: 0,
    monthly_volume: 0,
    created_at: '2026-03-20',
    stripe_onboarding_complete: false,
  },
];

const ACTIVITY_FEED = [
  { id: 1, icon: '💳', msg: 'Nueva recarga en Liceo Sakbe', detail: '+$500.00', time: 'Hace 2 min', color: '#22c55e' },
  { id: 2, icon: '🏫', msg: 'Nuevo colegio registrado', detail: 'Instituto Cumbres', time: 'Hace 1h', color: '#f4c430' },
  { id: 3, icon: '👤', msg: '18 nuevos alumnos en Sakbe', detail: 'Importación CSV', time: 'Hace 3h', color: '#7CB9E8' },
  { id: 4, icon: '⚡', msg: 'Webhook Stripe procesado', detail: 'payment_intent.succeeded', time: 'Hace 5h', color: '#a855f7' },
  { id: 5, icon: '🏷️', msg: 'Tag NFC vinculado', detail: 'Juan Pérez · Sakbe', time: 'Hace 6h', color: '#7CB9E8' },
];

const DATE_RANGES = ['Hoy', 'Últimos 7 días', 'Este Mes', 'Año actual'];

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  active: { label: 'Activo', class: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  suspended: { label: 'Suspendido', class: 'bg-red-100 text-red-600 border border-red-200' },
  onboarding: { label: 'En Onboarding', class: 'bg-amber-100 text-amber-700 border border-amber-200' },
};

// ── KPI Card ───────────────────────────────────────────────
function KpiCard({
  label, value, trend, trendLabel, icon: Icon, color,
}: {
  label: string; value: string; trend: number; trendLabel: string;
  icon: any; color: string;
}) {
  const positive = trend >= 0;
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
        <div className={`flex items-center gap-1.5 mt-2 text-xs font-bold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
          <TrendingUp className={`h-3.5 w-3.5 ${!positive ? 'rotate-180' : ''}`} />
          <span>{positive ? '+' : ''}{trend}% {trendLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ── Dropdown Menu ──────────────────────────────────────────
function SchoolActionsMenu({ school, host }: { school: any; host: string }) {
  const [open, setOpen] = useState(false);
  const isLocal = host.includes('localhost');
  const protocol = isLocal ? 'http' : 'https';
  const panelUrl = `${protocol}://${school.subdomain}.${isLocal ? host.replace(/^[^.]+\./, '') : 'nutripass.com'}/school`;

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
            <a href={panelUrl} target="_blank" className="flex items-center gap-3 px-4 py-3 text-sm text-[#004B87] font-semibold hover:bg-[#f0f5fb] transition">
              <ExternalLink className="h-4 w-4 text-[#7CB9E8]" /> Entrar al Panel
            </a>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#004B87] font-semibold hover:bg-[#f0f5fb] transition">
              <Settings className="h-4 w-4 text-[#7CB9E8]" /> Configuración Stripe
            </button>
            <hr className="border-[#e8f0f7] my-1" />
            <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 font-semibold hover:bg-red-50 transition">
              <Ban className="h-4 w-4" /> Suspender
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────
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

// ── Main Component ─────────────────────────────────────────
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

  const schools = initialSchools.length > 0 ? initialSchools : MOCK_SCHOOLS;

  const grossVolume = schools.reduce((s: number, sc: any) => s + (sc.monthly_volume || 0), 0) || 415700;
  const netRevenue = Math.round(grossVolume * 0.10);
  const activeSchools = schools.filter((s: any) => s.status !== 'suspended').length || schools.length;

  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:9002';

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#0d1f3c] tracking-tight">Dashboard Maestro</h1>
          <p className="text-[#8aa8cc] font-medium mt-1">Resumen global de la plataforma NutriPass.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="relative">
            <button
              onClick={() => setOpenRange(o => !o)}
              className="flex items-center gap-2 bg-white border border-[#e8f0f7] rounded-xl px-4 py-2.5 text-sm font-bold text-[#0d1f3c] hover:bg-[#f0f5fb] transition shadow-sm"
            >
              <Activity className="h-4 w-4 text-[#7CB9E8]" />
              {selectedRange}
              <ChevronDown className="h-4 w-4 text-[#8aa8cc]" />
            </button>
            {openRange && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpenRange(false)} />
                <div className="absolute right-0 top-12 z-20 bg-white rounded-xl shadow-xl border border-[#e8f0f7] overflow-hidden w-44">
                  {DATE_RANGES.map(r => (
                    <button
                      key={r}
                      onClick={() => { setSelectedRange(r); setOpenRange(false); }}
                      className={`w-full text-left px-4 py-3 text-sm font-semibold transition ${selectedRange === r ? 'bg-[#e8f0f7] text-[#2b5fa6] font-black' : 'text-[#0d1f3c] hover:bg-[#f0f5fb]'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <CreateSchoolModal />
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard label="Volumen Procesado" value={`$${grossVolume.toLocaleString()}`} trend={12.4} trendLabel="vs mes anterior" icon={DollarSign} color="#7CB9E8" />
        <KpiCard label="Ingresos NutriPass" value={`$${netRevenue.toLocaleString()}`} trend={8.1} trendLabel="vs mes anterior" icon={TrendingUp} color="#F4C430" />
        <KpiCard label="Escuelas Activas" value={String(activeSchools)} trend={33.3} trendLabel="nuevo ingreso" icon={Building2} color="#22c55e" />
        <KpiCard label="Usuarios Activos" value={(usersCount || 842).toLocaleString()} trend={5.7} trendLabel="vs mes anterior" icon={Users} color="#a855f7" />
      </div>

      {/* ── Chart + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e8f0f7] shadow-sm p-7">
          <div className="flex justify-between items-start mb-7">
            <div>
              <h2 className="text-xl font-black text-[#0d1f3c]">Volumen de Transacciones</h2>
              <p className="text-[#8aa8cc] text-sm mt-0.5">Últimos 15 días — Todos los tenants</p>
            </div>
            <div className="flex gap-4 text-xs font-bold">
              <span className="flex items-center gap-1.5 text-[#7CB9E8]"><span className="h-3 w-3 rounded-sm bg-[#7CB9E8] inline-block" /> Volumen</span>
              <span className="flex items-center gap-1.5 text-[#F4C430]"><span className="h-3 w-3 rounded-sm bg-[#F4C430] inline-block" /> Ingresos</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={CHART_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradVol" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7CB9E8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7CB9E8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradIng" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F4C430" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F4C430" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f5fb" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8aa8cc', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#8aa8cc', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="volumen" stroke="#7CB9E8" strokeWidth={2.5} fill="url(#gradVol)" />
              <Area type="monotone" dataKey="ingresos" stroke="#F4C430" strokeWidth={2.5} fill="url(#gradIng)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-2xl border border-[#e8f0f7] shadow-sm p-7">
          <h2 className="text-xl font-black text-[#0d1f3c] mb-5">Actividad Reciente</h2>
          <div className="space-y-1 relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-5 bottom-5 w-px bg-[#e8f0f7]" />
            {ACTIVITY_FEED.map((item) => (
              <div key={item.id} className="flex gap-4 items-start p-3 rounded-xl hover:bg-[#f8fafd] transition cursor-pointer relative">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 z-10 shadow-sm border border-white"
                  style={{ backgroundColor: item.color + '22' }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#0d1f3c] font-bold text-sm leading-tight">{item.msg}</p>
                  <p className="text-[#7CB9E8] font-semibold text-xs mt-0.5">{item.detail}</p>
                  <p className="text-[#b0c8e0] text-[10px] font-semibold mt-1">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Enhanced Schools Table ── */}
      <div className="bg-white rounded-2xl border border-[#e8f0f7] shadow-sm overflow-hidden">
        <div className="px-7 py-5 border-b border-[#f0f5fb] flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-[#0d1f3c]">Salud de Tenants</h2>
            <p className="text-[#8aa8cc] text-sm mt-0.5">{schools.length} colegios registrados en la plataforma</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f0f5fb] text-[#8aa8cc] text-[11px] font-black uppercase tracking-widest border-b border-[#e8f0f7]">
                <th className="px-7 py-4">Colegio</th>
                <th className="px-7 py-4">Estado</th>
                <th className="px-7 py-4 text-center">Usuarios</th>
                <th className="px-7 py-4 text-right">Volumen Mensual</th>
                <th className="px-7 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {schools.map((school: any) => {
                const initials = school.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
                const status = STATUS_MAP[school.status || 'active'];
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
                      <span className={`px-3 py-1.5 rounded-full text-xs font-black ${status.class}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-7 py-5 text-center">
                      <span className="font-black text-[#0d1f3c] text-base">{(school.users || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-7 py-5 text-right">
                      <span className="font-black text-[#0d1f3c] text-base">
                        ${(school.monthly_volume || 0).toLocaleString()}
                      </span>
                      {school.monthly_volume > 0 && (
                        <p className="text-emerald-500 text-xs font-bold mt-0.5">+12% este mes</p>
                      )}
                    </td>
                    <td className="px-7 py-5 text-right">
                      <SchoolActionsMenu school={school} host={host} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
