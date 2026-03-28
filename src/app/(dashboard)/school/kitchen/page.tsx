import { createClient } from '@/utils/supabase/server';
import { markMenuAsPrepared } from './actions';

export default async function KitchenReportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user?.id).maybeSingle();

  if (!profile?.school_id) return <div>Acceso denegado</div>;

  // Fetch menus and pre_orders separately to avoid nested RLS issues
  const { data: menus } = await supabase
    .from('daily_menus')
    .select(`
      id, date, soup_name, main_course_name, side_dish_name, dessert_name, drink_name,
      products ( name )
    `)
    .eq('school_id', profile.school_id)
    .order('date', { ascending: true });

  // Fetch paid pre_orders for this school's menus separately
  const menuIds = (menus || []).map(m => m.id);
  const { data: paidOrders } = menuIds.length > 0
    ? await supabase
        .from('pre_orders')
        .select('id, daily_menu_id, status')
        .in('daily_menu_id', menuIds)
        .eq('status', 'paid')
    : { data: [] };

  // Group by date
  const groupedTasks: Record<string, any[]> = {};
  menus?.forEach(menu => {
    const count = (paidOrders || []).filter(o => o.daily_menu_id === menu.id).length;
    if (count > 0) {
      if (!groupedTasks[menu.date]) groupedTasks[menu.date] = [];
      groupedTasks[menu.date].push({
        menuId: menu.id,
        name: menu.products ? (menu.products as any).name : (menu.main_course_name ? `${menu.soup_name ? menu.soup_name + ', ' : ''}${menu.main_course_name}` : 'Menú del Día'),
        count
      });
    }
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reporte de Cocina</h1>
        <p className="text-slate-500 mt-2">Sumario de preparación basado en las pre-órdenes pagadas activas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(groupedTasks).map(([date, items]) => (
          <div key={date} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
            <h2 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 mb-4 uppercase tracking-widest">
              {new Date(date).toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' })}
            </h2>
            
            {items.length === 0 ? (
              <p className="text-slate-400 text-sm flex-1">Sin órdenes pendientes.</p>
            ) : (
              <div className="space-y-4 flex-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-700">{item.name}</span>
                      <span className="text-primary font-black text-lg">
                        {item.count} <span className="text-xs font-medium opacity-80">pzs</span>
                      </span>
                    </div>
                    <form action={async () => {
                      'use server';
                      await markMenuAsPrepared(item.menuId);
                    }}>
                      <button type="submit" className="h-10 w-10 bg-white border border-slate-200 text-slate-400 font-black rounded-lg hover:bg-green-500 hover:text-white hover:border-green-500 transition-all shadow-sm flex items-center justify-center">
                        ✓
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {Object.keys(groupedTasks).length === 0 && (
          <div className="col-span-full text-center p-12 bg-white rounded-3xl border border-slate-100 border-dashed">
            <div className="text-6xl mb-4">🍽️</div>
            <h3 className="text-xl text-slate-500 font-bold">Sin órdenes pendientes por preparar.</h3>
          </div>
        )}
      </div>
    </div>
  );
}
