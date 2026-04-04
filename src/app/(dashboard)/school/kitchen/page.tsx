import { createClient } from '@/utils/supabase/server';
import { getEffectiveSchoolId } from '@/utils/auth/effective-school';
import { markMenuAsPrepared } from './actions';
import { Utensils, Coffee, AlertCircle, User, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  // Use adminClient to bypass RLS properly
  const { createAdminClient } = await import('@/utils/supabase/server');
  const adminClient = await createAdminClient();

  // Step 0: Get all consumer IDs for this school to scope results
  const { data: schoolConsumers } = await adminClient
    .from('consumers')
    .select('id')
    .eq('school_id', schoolId);
  const consumerIds = (schoolConsumers || []).map((c: any) => c.id);

  if (consumerIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-2xl font-black text-[#1a3a5c] mb-2">Sin Alumnos</p>
        <p className="text-[#8aa8cc]">Registra alumnos primero para ver órdenes de cocina.</p>
      </div>
    );
  }

  // Step 1: Fetch orders for THIS school's consumers only
  const { data: orders, error } = await adminClient
    .from('pre_orders')
    .select(`
      id, 
      status, 
      order_date,
      created_at,
      daily_menu_id,
      product_id,
      special_instructions,
      has_allergy_override,
      daily_menus ( id, date, soup_name, main_course_name, side_dish_name, dessert_name, drink_name ),
      consumers ( first_name, last_name, allergies )
    `)
    .in('consumer_id', consumerIds)
    .eq('status', 'paid')
    .order('created_at', { ascending: true });

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-12 bg-red-50 border-2 border-red-200 rounded-[2.5rem] mt-10">
        <h2 className="text-2xl font-black text-red-600 mb-4 flex items-center gap-2">
          <AlertCircle className="h-8 w-8" /> Error de Configuración (Base de Datos)
        </h2>
        <p className="text-red-900 font-bold mb-6 bg-white p-4 rounded-2xl border border-red-100">
          {error.message}
        </p>
        <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl font-mono text-sm overflow-x-auto">
          <p className="text-emerald-400 mb-2">-- Copia y pega esto en tu SQL Editor de Supabase:</p>
          <code>
            ALTER TABLE public.pre_orders <br/>
            ADD COLUMN IF NOT EXISTS special_instructions TEXT, <br/>
            ADD COLUMN IF NOT EXISTS has_allergy_override BOOLEAN DEFAULT FALSE;
          </code>
        </div>
      </div>
    );
  }

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

  // Group by date and then by dish name
  const aggregatedProduction: Record<string, Record<string, any>> = {};

  orders?.forEach(order => {
    const rawDate = (order as any).order_date
      || (order.daily_menus as any)?.date
      || (order as any).created_at?.split('T')[0];
    if (!rawDate) return;
    const date = rawDate;

    if (!aggregatedProduction[date]) aggregatedProduction[date] = {};
    
    let itemName = 'DESCONOCIDO';
    let category = 'snack';

    if (order.daily_menus) {
        itemName = (order.daily_menus as any).main_course_name ? `COMBO: ${(order.daily_menus as any).main_course_name.toUpperCase()}` : 'COMBO COMEDOR';
        category = 'comedor';
    } else if (order.product_id && productsMap[order.product_id]) {
        itemName = productsMap[order.product_id].name.toUpperCase();
        category = productsMap[order.product_id].category;
    }

    if (!aggregatedProduction[date][itemName]) {
        aggregatedProduction[date][itemName] = {
            itemName,
            category,
            totalQuantity: 0,
            hasSpecialOrAllergy: false,
        };
    }

    aggregatedProduction[date][itemName].totalQuantity += 1;
    
    const allergies = (order.consumers as any).allergies || [];
    if (order.has_allergy_override || order.special_instructions || allergies.length > 0) {
        aggregatedProduction[date][itemName].hasSpecialOrAllergy = true;
    }
  });

  const sortedDates = Object.keys(aggregatedProduction).sort();

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-4xl font-black text-[#1a3a5c] tracking-tight">Reporte de Cocina</h1>
          <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Producción base agregada (iPad View).
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
            <span className="text-sm font-black text-slate-700 uppercase tracking-widest">En Vivo</span>
        </div>
      </div>

      <div className="space-y-12">
        {sortedDates.map((date) => {
          const dishes = Object.values(aggregatedProduction[date]);
          // Sort dishes by quantity descending to show biggest batches first
          dishes.sort((a, b) => b.totalQuantity - a.totalQuantity);
          
          return (
            <div key={date} className="flex flex-col bg-slate-50/50 rounded-[2.5rem] p-6 md:p-8 border border-slate-200 shadow-inner">
              <div className="flex items-center justify-between mb-8 border-b border-slate-200 pb-4">
                  <h2 className="text-3xl font-black text-[#1a3a5c] capitalize">
                      {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h2>
                  <span className="bg-[#1a3a5c] text-white px-5 py-2 rounded-full text-sm font-black tracking-widest uppercase shadow-md">
                      {dishes.length} Platillos Distintos
                  </span>
              </div>

              {/* Grid de 3 columnas máximo con gap amplio */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {dishes.map((dish, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "relative bg-white rounded-[2rem] border-2 p-8 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col items-center text-center",
                        dish.hasSpecialOrAllergy ? "border-amber-400 ring-4 ring-amber-100 shadow-amber-100" : "border-[#e8f0f7]"
                      )}
                    >
                        {dish.hasSpecialOrAllergy && (
                            <div className="absolute top-4 right-4 text-amber-500 animate-pulse bg-amber-50 p-2 rounded-full">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                        )}
                        
                        {/* Cantidad (La Estrella) */}
                        <div className="flex items-baseline justify-center mb-2">
                            <span className="text-green-600 font-extrabold text-7xl md:text-8xl tracking-tight leading-none">
                                {dish.totalQuantity}
                            </span>
                            <span className="text-green-500/60 font-black text-3xl ml-1">x</span>
                        </div>
                        
                        {/* Separador sutil */}
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full my-4"></div>

                        {/* Platillo (Completo, SIN TRUNCAR) */}
                        <h3 className="text-2xl md:text-3xl font-black text-[#1a3a5c] uppercase leading-tight mb-6">
                            {dish.itemName}
                        </h3>

                        {/* Información Secundaria */}
                        <div className="mt-auto pt-4 border-t border-slate-100 w-full flex items-center justify-between">
                            <span className={cn(
                                "text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border",
                                dish.category === 'comedor' ? "bg-orange-50 text-orange-600 border-orange-200" : 
                                dish.category === 'bebida' ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-amber-50 text-amber-600 border-amber-200"
                            )}>
                                {dish.category}
                            </span>
                            <span className="text-slate-400 font-bold text-sm">
                                Pedidos: {dish.totalQuantity}
                            </span>
                        </div>

                    </div>
                  ))}
              </div>
            </div>
          );
        })}

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
