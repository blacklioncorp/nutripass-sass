import { createClient } from '@/utils/supabase/server';
import { getEffectiveSchoolId } from '@/utils/auth/effective-school';
import { markMenuAsPrepared } from './actions';
import { Utensils, Coffee, AlertCircle, User, CheckCircle2 } from 'lucide-react';

export default async function KitchenReportPage() {
  const supabase = await createClient();
  const schoolId = await getEffectiveSchoolId();

  if (!schoolId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-2xl font-black text-[#1a3a5c] mb-2">Acceso Denegado</p>
        <p className="text-[#8aa8cc]">No tienes una escuela asignada o tu sesión de administrador ha expirado.</p>
      </div>
    );
  }

  // Step 1: Fetch orders with daily_menus and consumers (these FKs exist)
  const { data: orders, error } = await supabase
    .from('pre_orders')
    .select(`
      id, 
      status, 
      order_date,
      daily_menu_id,
      product_id,
      daily_menus ( id, date, soup_name, main_course_name, side_dish_name, dessert_name, drink_name ),
      consumers ( first_name, last_name, allergies )
    `)
    .eq('status', 'paid')
    .order('created_at', { ascending: true });

  if (error) return <div>Error: {error.message}</div>;

  // Step 2: Collect unique product_ids and fetch them separately (no FK in schema)
  const productIds = [...new Set((orders || []).map(o => o.product_id).filter(Boolean))];
  const productsMap: Record<string, { name: string; category: string }> = {};

  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, category')
      .in('id', productIds as string[]);
    (products || []).forEach(p => { productsMap[p.id] = p; });
  }

  // Group by date and then by student
  const groupedTasks: Record<string, any[]> = {};

  orders?.forEach(order => {
    // Determine the date for this item
    const date = order.order_date || (order.daily_menus as any)?.date;
    if (!date) return;

    if (!groupedTasks[date]) groupedTasks[date] = [];
    
    const studentName = `${(order.consumers as any).first_name} ${(order.consumers as any).last_name}`;
    const allergies = (order.consumers as any).allergies || [];
    
    let itemName = 'Desconocido';
    let category = 'snack';

    if (order.daily_menus) {
        itemName = (order.daily_menus as any).main_course_name ? `COMBO: ${(order.daily_menus as any).main_course_name}` : 'Combo Comedor';
        category = 'comedor';
    } else if (order.product_id && productsMap[order.product_id]) {
        itemName = productsMap[order.product_id].name;
        category = productsMap[order.product_id].category;
    }

    groupedTasks[date].push({
        id: order.id,
        itemName,
        category,
        studentName,
        allergies
    });
  });

  const sortedDates = Object.keys(groupedTasks).sort();

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-4xl font-black text-[#1a3a5c] tracking-tight">Reporte de Cocina</h1>
          <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Producción basada en pre-órdenes pagadas activas.
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm font-black text-slate-700 uppercase tracking-widest">En Vivo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {sortedDates.map((date) => (
          <div key={date} className="flex flex-col h-full bg-slate-50/50 rounded-[2.5rem] p-4 border border-slate-200 shadow-inner">
            <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex-1">
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-5">
                    <h2 className="text-2xl font-black text-[#1a3a5c] capitalize">
                        {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </h2>
                    <span className="bg-[#1a3a5c] text-white px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase">
                        {groupedTasks[date].length} Órdenes
                    </span>
                </div>

                <div className="space-y-4">
                    {groupedTasks[date].map((item, idx) => (
                        <div key={idx} className="group relative flex items-start gap-4 bg-white p-5 rounded-3xl border border-slate-100 hover:border-[#3b82f6] hover:shadow-xl transition-all duration-300">
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${
                                item.category === 'comedor' ? 'bg-orange-100 text-orange-600' : 
                                item.category === 'bebida' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                            }`}>
                                {item.category === 'comedor' ? <Utensils className="h-7 w-7" /> : <Coffee className="h-7 w-7" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-xl font-black text-[#1a3a5c] group-hover:text-[#3b82f6] transition-colors truncate">
                                        {item.itemName}
                                    </h3>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
                                        item.category === 'comedor' ? 'bg-orange-50 text-orange-500' : 
                                        item.category === 'bebida' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'
                                    }`}>
                                        {item.category}
                                    </span>
                                </div>

                                <div className="mt-3 flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                                        <User className="h-3.5 w-3.5 text-slate-500" />
                                        <span className="text-sm font-bold text-slate-700">{item.studentName}</span>
                                    </div>
                                    
                                    {item.allergies.length > 0 && (
                                        <div className="flex items-center gap-1.5 bg-red-100 px-3 py-1 rounded-full border border-red-200 animate-pulse">
                                            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                                            <span className="text-xs font-black text-red-600 uppercase tracking-tighter">
                                                {item.allergies.join(', ')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <form action={async () => {
                                'use server';
                                await markMenuAsPrepared(item.id);
                            }} className="self-center">
                                <button type="submit" className="h-12 w-12 bg-slate-50 border-2 border-slate-100 text-slate-300 rounded-2xl hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-200 transition-all duration-300 flex items-center justify-center">
                                    <CheckCircle2 className="h-6 w-6" />
                                </button>
                            </form>
                        </div>
                    ))}
                </div>
            </div>
          </div>
        ))}

        {sortedDates.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center">
            <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                <Utensils className="h-12 w-12 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-400 italic tracking-tight">Todo está listo. Sin órdenes pendientes.</h3>
          </div>
        )}
      </div>
    </div>
  );
}
