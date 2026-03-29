import { createClient } from '@/utils/supabase/server';
import SendReminderButton from '@/components/school/SendReminderButton';

export default async function SchoolDashboardPage() {
  const supabase = await createClient();

  // ── Get logged-in admin's school_id ──────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id, full_name')
    .eq('id', user?.id)
    .single();

  const schoolId = profile?.school_id || '';

  // ── Real DB queries, all scoped to this school ────────────────────────────
  const [
    { count: studentsCount },
    { count: staffCount },
    { data: todayTxs },
    { count: menusToday },
  ] = await Promise.all([
    supabase
      .from('consumers')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('type', 'student'),
    supabase
      .from('consumers')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('type', 'staff'),
    supabase
      .from('transactions')
      .select('amount')
      .eq('school_id', schoolId) // Added school_id filter
      .gte('created_at', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('daily_menus')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('date', new Date().toISOString().split('T')[0]),
  ]);

  const todaySales = todayTxs?.reduce((sum, t) => sum + (t.amount || 0), 0) ?? 0;

  const kpis = [
    { label: 'ESTUDIANTES', value: studentsCount ?? 0, icon: '👤' },
    { label: 'PERSONAL', value: staffCount ?? 0, icon: '👤' },
    {
      label: 'VENTAS HOY',
      value: `$${todaySales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon: '💳'
    },
    { label: 'MENÚS SERVIDOS', value: menusToday ?? 0, icon: '🍽️' },
  ];

  const isEmpty = (studentsCount ?? 0) === 0 && (staffCount ?? 0) === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[#8aa8cc] font-bold text-xs uppercase tracking-widest mb-1">DASHBOARD</p>
          <h1 className="text-4xl font-black text-[#1a3a5c] tracking-tight">Dashboard de Escuela</h1>
        </div>
        <SendReminderButton schoolId={schoolId} />
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
            {isEmpty ? (
              <p className="text-[#b0c8e0] text-xs font-medium mt-2">Sin registros aún</p>
            ) : (
              <p className="text-[#3b82f6] text-xs font-bold mt-2">↑ Datos en tiempo real</p>
            )}
          </div>
        ))}
      </div>

      {/* Empty state OR chart area */}
      {isEmpty ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-[#e8f0f7] p-16 text-center">
          <span className="text-6xl">🏫</span>
          <h2 className="text-xl font-black text-[#1a3a5c] mt-4">Tu escuela está lista</h2>
          <p className="text-[#8aa8cc] font-medium mt-2 max-w-md mx-auto">
            Empieza registrando alumnos en <strong>Gestión Usuarios</strong> y
            configurando el menú semanal en <strong>Planificador Menú</strong>.
            Las estadísticas aparecerán aquí automáticamente.
          </p>
          <div className="flex justify-center gap-4 mt-8">
            <a href="/school/consumers"
              className="bg-[#004B87] text-white font-black px-6 py-3 rounded-xl hover:bg-[#003870] transition shadow-sm">
              + Registrar Alumnos
            </a>
            <a href="/school/menu"
              className="bg-[#f0f5fb] text-[#004B87] font-black px-6 py-3 rounded-xl hover:bg-[#e8f0f7] transition">
              🍽️ Planificar Menú
            </a>
          </div>
        </div>
      ) : (
        /* Chart + Alerts — shown only when there's real data */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e8f0f7] shadow-sm p-8 flex items-center justify-center min-h-[200px]">
            <p className="text-[#8aa8cc] font-medium text-sm">Gráfica de consumo semanal — disponible pronto</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#e8f0f7] shadow-sm p-8">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-lg">ℹ️</span>
              <h2 className="text-[#1a3a5c] font-black text-xl">Alertas de Nutrición</h2>
            </div>
            <p className="text-[#8aa8cc] text-sm font-medium text-center py-8">Sin alertas activas</p>
          </div>
        </div>
      )}
    </div>
  );
}
