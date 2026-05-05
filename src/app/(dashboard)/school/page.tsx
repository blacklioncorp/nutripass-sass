import { createClient, createAdminClient } from '@/utils/supabase/server';
import { getEffectiveSchoolId } from '@/utils/auth/effective-school';
import SendReminderButton from '@/components/school/SendReminderButton';
import { redirect } from 'next/navigation';

import SchoolDashboardBI from '@/components/school/SchoolDashboardBI';

export default async function SchoolDashboardPage() {
  const supabase = await createClient();
  const adminClient = await createAdminClient();
  const schoolId = await getEffectiveSchoolId();
  // Use session-aware client to get the current user (adminClient has no cookies)
  const { data: { user } } = await supabase.auth.getUser();

  if (!schoolId || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-2xl font-black text-[#1a3a5c] mb-2 font-black italic tracking-tighter">Acceso Denegado</p>
        <p className="text-[#8aa8cc] font-medium">No tienes una escuela asignada o tu sesión de administrador ha expirado.</p>
      </div>
    );
  }

  // ── Real DB queries, all scoped to this school ────────────────────────────
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  // Start of today in ISO format for timestamp comparisons
  const todayStart = `${todayIso}T00:00:00.000Z`;
  const tomorrowStart = `${new Date(today.getTime() + 86400000).toISOString().split('T')[0]}T00:00:00.000Z`;


  const { data: school } = await adminClient
    .from('schools')
    .select('name')
    .eq('id', schoolId)
    .single();

  const schoolName = school?.name || 'Mi Escuela';

  // Fetch precise role and school
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'staff';

  // 1. Guard: Staff cannot access BI Dashboard, redirect to Kitchen instead of hard forcing POS
  if (role === 'staff') {
    redirect('/school/kitchen');
  }


  // Step 1: Get all consumer IDs for this school (students + staff)
  const { data: schoolConsumers } = await adminClient
    .from('consumers')
    .select('id')
    .eq('school_id', schoolId);

  const consumerIds = schoolConsumers?.map(c => c.id) ?? [];

  // Step 2: Get all wallet IDs for those consumers (pre-order txns only have wallet_id)
  const { data: schoolWallets } = consumerIds.length > 0
    ? await adminClient
        .from('wallets')
        .select('id')
        .in('consumer_id', consumerIds)
    : { data: [] };

  const walletIds = schoolWallets?.map(w => w.id) ?? [];

  const { getSchoolDailyKPIs, getSalesByGradeToday, getAllergyStats } = await import('@/app/(dashboard)/school/actions');

  const [
    { count: studentsCount },
    { count: staffCount },
    { data: topOrdersRaw },
    { data: highRiskOrders },
    kpiData,
    chartResult,
    allergyStats
  ] = await Promise.all([
    adminClient.from('consumers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('type', 'student'),
    adminClient.from('consumers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('type', 'staff'),
    // Top Products Aggregation — include BOTH product snacks AND daily_menu combos
    consumerIds.length > 0
      ? adminClient.from('pre_orders')
          .select('product_id, daily_menu_id, products(name, base_price), daily_menus(main_course_name, combo_price)')
          .in('consumer_id', consumerIds)
          .eq('status', 'paid')
          .order('created_at', { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [] }),
    // Nutrition Alerts — show orders with allergy overrides or special instructions (entire week)
    consumerIds.length > 0
      ? adminClient.from('pre_orders').select(`
            id, special_instructions, has_allergy_override,
            consumers ( first_name, last_name, allergies ),
            daily_menus ( main_course_name ),
            products ( name )
          `).in('consumer_id', consumerIds).gte('order_date', todayIso).or('has_allergy_override.eq.true,special_instructions.not.is.null')
      : Promise.resolve({ data: [] }),
    // Multitenant Daily KPIs
    getSchoolDailyKPIs(),
    // Ventas por Grado
    getSalesByGradeToday(),
    // Allergy Monitoring
    getAllergyStats()
  ]);

  const chartData = chartResult?.data || [];

  // Process Top 5 Products — includes both combos (daily_menu) and snacks (product)
  const productAgg: Record<string, { name: string; quantity: number; revenue: number }> = {};
  (topOrdersRaw || []).forEach((o: any) => {
    // Handle snack/product items
    if (o.product_id && o.products) {
      const pid = o.product_id;
      if (!productAgg[pid]) {
        productAgg[pid] = { name: o.products.name, quantity: 0, revenue: 0 };
      }
      productAgg[pid].quantity += 1;
      productAgg[pid].revenue += Number(o.products.base_price || 0);
    }
    // Handle daily_menu combo items
    else if (o.daily_menu_id && o.daily_menus) {
      const menuName = o.daily_menus.main_course_name || 'Combo del Día';
      const menuKey = `menu-${menuName}`;
      if (!productAgg[menuKey]) {
        productAgg[menuKey] = { name: menuName, quantity: 0, revenue: 0 };
      }
      productAgg[menuKey].quantity += 1;
      productAgg[menuKey].revenue += Number(o.daily_menus.combo_price || 70);
    }
  });

  const topProducts = Object.values(productAgg)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Dietary alerts mapping
  const processedAlerts = (highRiskOrders || []).map((order: any) => ({
    ...order,
    consumers: Array.isArray(order.consumers) ? order.consumers[0] : order.consumers,
    daily_menus: Array.isArray(order.daily_menus) ? order.daily_menus[0] : order.daily_menus,
    products: Array.isArray(order.products) ? order.products[0] : order.products,
  }));

  const kpis = [
    { label: 'VENTA TOTAL HOY', value: `$${kpiData.ventaTotalHoy.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: '💳' },
    { label: 'ALUMNOS ATENDIDOS', value: kpiData.alumnosAtendidos ?? 0, icon: '👤' },
    { label: 'TICKET PROMEDIO', value: `$${kpiData.ticketPromedio.toFixed(2)}`, icon: '📈' },
    { label: 'SALDO TOTAL ESCOLAR', value: `$${kpiData.saldoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: '🏦' },
  ];

  const isEmpty = (studentsCount ?? 0) === 0 && (staffCount ?? 0) === 0;

  if (isEmpty) {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-[#1a3a5c] tracking-tight">Dashboard de Escuela</h1>
            <p className="text-[#8aa8cc] font-medium text-xs tracking-tight uppercase mt-1">Configuración requerida</p>
          </div>
          <SendReminderButton schoolId={schoolId} />
        </div>

        <div className="bg-white rounded-[3rem] border-4 border-dashed border-[#e8f0f7] p-24 text-center">
            <span className="text-6xl mb-6 block">🏫</span>
            <h2 className="text-2xl font-black text-[#1a3a5c] mt-4 tracking-tight uppercase italic">Tu escuela está lista</h2>
            <p className="text-[#8aa8cc] font-medium mt-4 max-w-lg mx-auto text-lg leading-relaxed italic">
              Empieza registrando alumnos en <strong>Gestión Usuarios</strong> y
              configurando el menú semanal en <strong>Planificador Menú</strong>.
            </p>
            <div className="flex justify-center gap-6 mt-12">
              <a href="/school/consumers" className="bg-[#1a3a5c] text-white font-black px-10 py-5 rounded-2xl hover:bg-[#0d1f3c] transition shadow-xl shadow-blue-900/10 active:scale-95">
                + Registrar Alumnos
              </a>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <SchoolDashboardBI 
        chartData={chartData}
        topProducts={topProducts}
        alerts={processedAlerts}
        kpis={kpis}
        allergyData={allergyStats?.topAllergies || []}
        totalWithAllergies={allergyStats?.totalWithAllergies || 0}
        isEmpty={isEmpty}
        schoolName={schoolName}
      />
    </div>
  );
}
