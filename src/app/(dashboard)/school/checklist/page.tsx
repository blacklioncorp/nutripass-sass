import { createClient } from '@/utils/supabase/server';
import { Package, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function ChecklistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user?.id).single();

  if (!profile?.school_id) return <div className="p-12 text-center text-slate-500 font-bold">Acceso denegado</div>;

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
      <div className="max-w-5xl mx-auto space-y-8 p-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checklist de Cafetería</h1>
          <p className="text-slate-500 mt-2 font-medium">Seguimiento de entrega de snacks, bebidas y desayunos pre-pagados.</p>
        </div>
        <div className="text-center p-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center">
            <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Package className="h-12 w-12 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-400 italic tracking-tight">No hay alumnos registrados en esta sede.</h3>
        </div>
      </div>
    );
  }

  // Fetch ALL paid pre_orders for this school
  const { data: allOrders, error: fetchError } = await adminClient
    .from('pre_orders')
    .select(`
      id, order_date, created_at, status, product_id, daily_menu_id,
      special_instructions, has_allergy_override,
      consumers ( first_name, last_name, allergies )
    `)
    .in('consumer_id', consumerIds)
    .eq('status', 'paid')
    .order('created_at', { ascending: true });

  if (fetchError) {
    return (
      <div className="max-w-6xl mx-auto p-12 bg-red-50 border-2 border-red-200 rounded-[2.5rem] mt-10">
        <h2 className="text-2xl font-black text-red-600 mb-4 flex items-center gap-2">
          <AlertCircle className="h-8 w-8" /> Error de Base de Datos
        </h2>
        <p className="text-red-900 font-bold mb-6 bg-white p-4 rounded-2xl border border-red-100">
          {fetchError.message}
        </p>
        <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl font-mono text-sm overflow-x-auto">
          <p className="text-emerald-400 mb-2">-- Por favor ejecuta este SQL en tu Dashboard de Supabase:</p>
          <code>
            ALTER TABLE public.pre_orders <br/>
            ADD COLUMN IF NOT EXISTS special_instructions TEXT, <br/>
            ADD COLUMN IF NOT EXISTS has_allergy_override BOOLEAN DEFAULT FALSE;
          </code>
        </div>
      </div>
    );
  }

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
    const { data: products } = await adminClient
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

  // Group by date
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

  const sortedDates = Object.keys(groupedDates).sort();

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 p-6 md:p-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Checklist de Cafetería</h1>
          <p className="text-slate-500 mt-2 font-medium">Seguimiento de entrega de snacks, bebidas y desayunos pre-pagados.</p>
        </div>
      </div>

      <div className="space-y-12">
        {sortedDates.map((date) => (
          <div key={date} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black shadow-lg">
                {new Date(date + 'T12:00:00').getDate()}
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-800 capitalize leading-none">
                  {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 block">
                  {groupedDates[date].length} Órdenes Programadas
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedDates[date].map((order: any) => {
                const colors = typeColors[order.orderType] ?? typeColors.snack;
                const allergies = (order.consumers as any)?.allergies || [];
                const hasAllergyAlert = order.has_allergy_override || order.special_instructions || allergies.length > 0;

                return (
                  <div 
                    key={order.id} 
                    className={cn(
                      "bg-white p-6 rounded-[2.5rem] shadow-sm border transition-all duration-300 flex flex-col gap-6",
                      hasAllergyAlert 
                        ? "bg-red-50 border-red-200 border-l-4 border-l-red-500 shadow-md" 
                        : "border-slate-100 hover:shadow-xl hover:border-slate-200"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center text-xl shadow-inner",
                          hasAllergyAlert ? "bg-red-100 text-red-600" : colors.bg
                        )}>
                          {hasAllergyAlert ? '⚠️' : order.orderType === 'bebida' ? '🥤' : '🥐'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alumno</span>
                          <span className={cn(
                            "font-black text-lg leading-tight",
                            hasAllergyAlert ? "text-red-950" : "text-slate-800"
                          )}>
                             {(order.consumers as any)?.first_name} {(order.consumers as any)?.last_name}
                          </span>
                        </div>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                        hasAllergyAlert ? "bg-red-600 text-white shadow-sm" : colors.badge
                      )}>
                        {order.orderType}
                      </div>
                    </div>

                    <div className={cn(
                      "p-4 rounded-2xl border flex items-center gap-3 shadow-sm",
                      hasAllergyAlert ? "bg-white border-red-200" : colors.bg + " border-slate-100/50"
                    )}>
                      <Package className={cn("h-5 w-5", hasAllergyAlert ? "text-red-500" : "text-slate-400")} />
                      <span className={cn(
                        "font-black text-base leading-tight",
                        hasAllergyAlert ? "text-red-900" : "text-slate-700"
                      )}>{order.itemName}</span>
                    </div>

                    {((allergies.length > 0) || order.special_instructions) && (
                      <div className="space-y-3">
                        {allergies.length > 0 && (
                          <div className="flex items-center gap-1.5 bg-red-100 px-3 py-1.5 rounded-full border border-red-200 w-fit animate-pulse">
                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-[10px] font-black text-red-600 uppercase">
                              Alérgico: {allergies.join(', ')}
                            </span>
                          </div>
                        )}
                        
                        {order.special_instructions && (
                          <div className="p-4 bg-white/60 border-2 border-red-500/20 border-dashed rounded-2xl">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2 mb-1">
                              <AlertCircle className="h-3 w-3" /> Nota del Padre:
                            </p>
                            <p className="font-black text-red-700 italic text-base leading-tight">
                              "{order.special_instructions}"
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <form action={async () => {
                      'use server';
                      const { createAdminClient: createAdmin } = await import('@/utils/supabase/server');
                      const { revalidatePath } = await import('next/cache');
                      const supabaseAdmin = await createAdmin();
                      await supabaseAdmin.from('pre_orders').update({ status: 'consumed' }).eq('id', order.id);
                      revalidatePath('/school/checklist');
                    }} className="mt-auto">
                      <button 
                        type="submit" 
                        className={cn(
                          "w-full h-14 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 group",
                          hasAllergyAlert 
                            ? "bg-red-600 text-white hover:bg-red-700" 
                            : "bg-slate-900 text-white hover:bg-slate-800"
                        )}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="uppercase tracking-widest text-xs">Entregar Pedido</span>
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {sortedDates.length === 0 && (
          <div className="p-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center">
            <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Package className="h-12 w-12 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-400 italic tracking-tight">No hay órdenes para este periodo.</h3>
          </div>
        )}
      </div>
    </div>
  );
}
