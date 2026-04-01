import { createClient } from '@/utils/supabase/server';
import { Package, Calendar, CheckCircle2 } from 'lucide-react';

export default async function ChecklistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user?.id).single();

  if (!profile?.school_id) return <div>Acceso denegado</div>;

  // Use adminClient to bypass RLS - filter by school consumers manually
  const { createAdminClient } = await import('@/utils/supabase/server');
  const adminClient = await createAdminClient();

  // Get all consumer IDs for this school
  const { data: schoolConsumers } = await adminClient
    .from('consumers')
    .select('id')
    .eq('school_id', profile.school_id);

  const consumerIds = (schoolConsumers || []).map((c: any) => c.id);

  if (consumerIds.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checklist de Cafetería</h1>
          <p className="text-slate-500 mt-2">Seguimiento de entrega de snacks, bebidas y desayunos pre-pagados.</p>
        </div>
        <div className="text-center p-12 bg-white rounded-3xl border border-slate-100 border-dashed">
          <div className="text-6xl mb-4">🥨</div>
          <h3 className="text-xl text-slate-500 font-bold">No hay órdenes pendientes por entregar.</h3>
        </div>
      </div>
    );
  }

  const todayIso = new Date().toISOString().split('T')[0];

  // Fetch ALL paid pre_orders for this school from today onwards (snacks + comedor)
  const { data: allOrders } = await adminClient
    .from('pre_orders')
    .select(`
      id, order_date, created_at, status, product_id, daily_menu_id,
      consumers ( first_name, last_name, allergies )
    `)
    .in('consumer_id', consumerIds)
    .eq('status', 'paid')
    .order('created_at', { ascending: true });

  // Get daily_menu details for comedor orders
  const menuIds = [...new Set((allOrders || []).map((o: any) => o.daily_menu_id).filter(Boolean))];
  const menusMap: Record<string, { soup_name?: string; main_course_name?: string; combo_price?: number }> = {};
  if (menuIds.length > 0) {
    const { data: menus } = await adminClient
      .from('daily_menus')
      .select('id, soup_name, main_course_name, combo_price')
      .in('id', menuIds as string[]);
    (menus || []).forEach((m: any) => { menusMap[m.id] = m; });
  }

  // Fetch product details for snack orders
  const productIds = [...new Set((allOrders || []).map((o: any) => o.product_id).filter(Boolean))];
  const productsMap: Record<string, { name: string; category: string }> = {};
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, category')
      .in('id', productIds as string[]);
    (products || []).forEach((p: any) => { productsMap[p.id] = p; });
  }

  // Enrich orders with product/menu data
  const enrichedOrders = (allOrders || []).map((order: any) => {
    const isSnack = !!order.product_id;
    const product = isSnack ? productsMap[order.product_id] : null;
    const menu = !isSnack && order.daily_menu_id ? menusMap[order.daily_menu_id] : null;
    return {
      ...order,
      product,
      menu,
      isSnack,
      orderType: isSnack ? (product?.category ?? 'snack') : 'comedor',
      itemName: isSnack
        ? (product?.name ?? 'Producto')
        : (menu?.main_course_name ? `Desayuno: ${menu.main_course_name}` : 'Desayuno del Día'),
    };
  });

  // Group by date — fallback to created_at date for snacks where order_date is NULL
  const groupedDates: Record<string, any[]> = {};
  enrichedOrders.forEach((order: any) => {
    const date: string = order.order_date
      || (order.created_at ? order.created_at.split('T')[0] : null);
    if (!date) return;
    if (!groupedDates[date]) groupedDates[date] = [];
    groupedDates[date].push(order);
  });

  const typeColors: Record<string, { bg: string; badge: string }> = {
    snack:   { bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-700' },
    bebida:  { bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-700' },
    comedor: { bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700' },
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checklist de Cafetería</h1>
        <p className="text-slate-500 mt-2">Seguimiento de entrega de snacks, bebidas y desayunos pre-pagados.</p>
      </div>

      {Object.entries(groupedDates).length === 0 ? (
        <div className="text-center p-12 bg-white rounded-3xl border border-slate-100 border-dashed">
          <div className="text-6xl mb-4">🥨</div>
          <h3 className="text-xl text-slate-500 font-bold">No hay órdenes pendientes por entregar hoy.</h3>
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedDates).map(([date, orders]) => (
            <div key={date} className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' })}
                </h2>
                <span className="bg-slate-100 text-slate-500 text-xs font-black px-2 py-0.5 rounded-full">
                  {orders.length} {orders.length === 1 ? 'órden' : 'órdenes'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((order: any) => {
                  const colors = typeColors[order.orderType] ?? typeColors.snack;
                  const allergies = (order.consumers as any)?.allergies || [];
                  return (
                    <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Alumno</span>
                          <span className="font-bold text-slate-800">
                            {(order.consumers as any)?.first_name} {(order.consumers as any)?.last_name}
                          </span>
                        </div>
                        <div className={`${colors.badge} px-2 py-1 rounded-lg text-[10px] font-black uppercase`}>
                          {order.orderType}
                        </div>
                      </div>

                      <div className={`flex items-center gap-3 ${colors.bg} p-3 rounded-xl border border-slate-100`}>
                        <Package className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <span className="font-black text-slate-700 text-sm leading-tight">{order.itemName}</span>
                      </div>

                      {allergies.length > 0 && (
                        <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                          <span className="text-[10px] font-black text-red-600 uppercase flex items-center gap-1">
                            ⚠️ Alergias: {allergies.join(', ')}
                          </span>
                        </div>
                      )}

                      <form action={async () => {
                        'use server';
                        const { createAdminClient: createAdmin } = await import('@/utils/supabase/server');
                        const { revalidatePath } = await import('next/cache');
                        const supabaseAdmin = await createAdmin();
                        await supabaseAdmin.from('pre_orders').update({ status: 'consumed' }).eq('id', order.id);
                        revalidatePath('/school/checklist');
                      }}>
                        <button type="submit" className="w-full h-10 bg-slate-100 text-slate-400 font-black rounded-xl hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2 text-sm group">
                          <CheckCircle2 className="h-4 w-4 opacity-30 group-hover:opacity-100" />
                          Marcar Entregado
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
