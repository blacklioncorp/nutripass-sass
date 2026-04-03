import { createClient } from '@/utils/supabase/server';
import { getEffectiveSchoolId } from '@/utils/auth/effective-school';
import SendReminderButton from '@/components/school/SendReminderButton';
import { createAdminClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

import SchoolDashboardBI from '@/components/school/SchoolDashboardBI';

export default async function SchoolDashboardPage() {
  const supabase = await createClient();
  const schoolId = await getEffectiveSchoolId();
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
  const adminClient = await createAdminClient();
  const todayIso = new Date().toISOString().split('T')[0];

  // Fetch precise role and school
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'staff';

  // 1. Guard: Staff cannot access BI Dashboard
  if (role === 'staff') {
    redirect('/point-of-sale');
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

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString().split('T')[0];

  const [
    { count: studentsCount },
    { count: staffCount },
    { data: todayTxs },
    { count: ordersToday },
    { data: weeklyTxsRaw },
    { data: topOrdersRaw },
    { data: highRiskOrders },
  ] = await Promise.all([
    supabase.from('consumers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('type', 'student'),
    supabase.from('consumers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('type', 'staff'),
    // Today's Sales
    walletIds.length > 0
      ? adminClient.from('transactions').select('amount').in('wallet_id', walletIds).eq('type', 'debit').gte('created_at', todayIso)
      : Promise.resolve({ data: [] }),
    // Today's Orders Count
    consumerIds.length > 0
      ? adminClient.from('pre_orders').select('*', { count: 'exact', head: true }).in('consumer_id', consumerIds).eq('order_date', todayIso).eq('status', 'paid')
      : Promise.resolve({ count: 0 }),
    // Weekly Sales Trending ($)
    walletIds.length > 0
      ? adminClient.from('transactions').select('amount, created_at').in('wallet_id', walletIds).eq('type', 'debit').gte('created_at', sevenDaysAgoIso)
      : Promise.resolve({ data: [] }),
    // Top Products Aggregation (Base Data)
    consumerIds.length > 0
      ? adminClient.from('pre_orders').select('product_id, products(name, price)').in('consumer_id', consumerIds).not('product_id', 'is', null).order('created_at', { ascending: false }).limit(200)
      : Promise.resolve({ data: [] }),
    // Nutrition Alerts (High Risk Today)
    consumerIds.length > 0
      ? adminClient.from('pre_orders').select(`
            id, special_instructions, has_allergy_override,
            consumers ( first_name, last_name, allergies ),
            daily_menus ( main_course_name ),
            products ( name )
          `).in('consumer_id', consumerIds).eq('order_date', todayIso).or('has_allergy_override.eq.true,special_instructions.neq.null')
      : Promise.resolve({ data: [] }),
  ]);

  const todaySales = todayTxs?.reduce((sum, t) => sum + (Math.abs(t.amount) || 0), 0) ?? 0;
  const avgTicket = ordersToday && ordersToday > 0 ? (todaySales / ordersToday) : 0;

  // Process Weekly Sales Trend
  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split('T')[0]);
  }

  const chartData = last7Days.map(date => {
    const daySales = weeklyTxsRaw?.filter(tx => 
      (tx.created_at as string).split('T')[0] === date
    ).reduce((sum, tx) => sum + (Math.abs(tx.amount) || 0), 0) ?? 0;
    
    return {
      date: new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }),
      sales: daySales,
      date_iso: date // useful for CSV export later
    };
  });

  // Process Top 5 Products
  const productAgg: Record<string, { name: string; quantity: number; revenue: number }> = {};
  (topOrdersRaw || []).forEach((o: any) => {
    if (!o.product_id || !o.products) return;
    const pid = o.product_id;
    if (!productAgg[pid]) {
      productAgg[pid] = { name: o.products.name, quantity: 0, revenue: 0 };
    }
    productAgg[pid].quantity += 1;
    productAgg[pid].revenue += Number(o.products.price || 0);
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
    { label: 'VENTAS HOY', value: `$${todaySales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: '💳' },
    { label: 'ÓRDENES HOY', value: ordersToday ?? 0, icon: '🍽️' },
    { label: 'TICKET PROMEDIO', value: `$${avgTicket.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, icon: '📈' },
    { label: 'ESTUDIANTES', value: studentsCount ?? 0, icon: '👤' },
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
        isEmpty={isEmpty}
      />
    </div>
  );
}
