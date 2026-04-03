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

  // Group by date and then by student
  const groupedTasks: Record<string, any[]> = {};

  orders?.forEach(order => {
    // Determine the date for this item
    const rawDate = (order as any).order_date
      || (order.daily_menus as any)?.date
      || (order as any).created_at?.split('T')[0];
    if (!rawDate) return;
    const date = rawDate;

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
        allergies,
        specialInstructions: order.special_instructions,
        hasAllergyOverride: order.has_allergy_override
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
                    {groupedTasks[date].map((item, idx) => {
                        const hasAllergyAlert = item.hasAllergyOverride || item.specialInstructions || (item.allergies && item.allergies.length > 0);
                        
                        return (
                          <div 
                            key={idx} 
                            className={cn(
                              "group relative flex flex-col md:flex-row items-start gap-4 p-6 rounded-[2rem] border-2 transition-all duration-300 shadow-sm",
                              hasAllergyAlert 
                                ? "bg-red-50 border-red-500 ring-2 ring-red-500/10 shadow-red-100" 
                                : "bg-white border-[#e8f0f7] hover:border-[#3b82f6] hover:shadow-xl"
                            )}
                          >
                              {/* Left Icon Section */}
                              <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-sm ${
                                  hasAllergyAlert ? 'bg-red-600 text-white animate-pulse' :
                                  item.category === 'comedor' ? 'bg-orange-100 text-orange-600' : 
                                  item.category === 'bebida' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
                              }`}>
                                  {hasAllergyAlert ? <AlertCircle className="h-9 w-9" /> : 
                                   item.category === 'comedor' ? <Utensils className="h-8 w-8" /> : <Coffee className="h-8 w-8" />}
                              </div>
 
                              {/* Content Section */}
                              <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 flex-wrap">
                                      <h3 className={cn(
                                          "text-2xl font-black transition-colors leading-none",
                                          hasAllergyAlert ? "text-red-700" : "text-[#1a3a5c] group-hover:text-[#3b82f6]"
                                      )}>
                                          {item.itemName}
                                      </h3>
                                      <span className={cn(
                                          "text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-[0.1em] shadow-sm",
                                          hasAllergyAlert ? "bg-red-200 text-red-800" :
                                          item.category === 'comedor' ? "bg-orange-50 text-orange-600 border border-orange-100" : 
                                          item.category === 'bebida' ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                                      )}>
                                          {item.category}
                                      </span>
                                  </div>
 
                                  <div className="mt-3 flex items-center gap-3">
                                      <div className={cn(
                                          "flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-colors",
                                          hasAllergyAlert ? "bg-white border-red-200 text-red-900" : "bg-slate-50 border-slate-100 text-slate-600"
                                      )}>
                                          <User className={cn("h-4 w-4", hasAllergyAlert ? "text-red-500" : "text-slate-400")} />
                                          <span className="text-sm font-black uppercase tracking-tight">
                                            {item.studentName}
                                          </span>
                                      </div>
                                  </div>
 
                                  {/* CRITICAL SAFETY BANNER */}
                                  {hasAllergyAlert && (
                                    <div className="mt-6 p-5 bg-white border-4 border-red-500 rounded-[1.8rem] shadow-lg shadow-red-200/50 animate-in zoom-in-95 duration-500">
                                      <div className="flex items-center gap-2 mb-3 border-b border-red-100 pb-2">
                                        <div className="h-6 w-6 bg-red-600 rounded-lg flex items-center justify-center">
                                          <AlertCircle className="h-4 w-4 text-white" />
                                        </div>
                                        <p className="text-[11px] font-black text-red-600 uppercase tracking-[0.2em] italic">Seguridad Alimentaria • Alto Riesgo</p>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        {item.allergies.length > 0 && (
                                          <div className="flex items-baseline gap-2">
                                            <span className="text-xs font-black text-red-500 uppercase tracking-widest shrink-0">Alergia:</span>
                                            <span className="text-xl font-black text-red-700 uppercase italic">
                                              {item.allergies.join(', ')}
                                            </span>
                                          </div>
                                        )}
                                        
                                        {item.specialInstructions && (
                                          <div className="flex flex-col gap-1.5 mt-2 bg-red-50 p-4 rounded-2xl border-2 border-red-100">
                                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Ficha de Acción:</p>
                                            <p className="text-lg font-black text-red-800 leading-tight flex items-start gap-2">
                                              <span className="mt-1">⚠️</span>
                                              <span>ACCIÓN: {item.specialInstructions.toUpperCase()}</span>
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                              </div>
 
                              {/* Action Button */}
                              <form action={async () => {
                                  'use server';
                                  await markMenuAsPrepared(item.id);
                              }} className="self-center">
                                  <button type="submit" className={cn(
                                    "group/btn h-16 w-16 border-4 rounded-3xl transition-all duration-300 flex items-center justify-center shadow-xl active:scale-90",
                                    hasAllergyAlert 
                                      ? "bg-red-600 border-red-700 text-white hover:bg-red-700 shadow-red-200" 
                                      : "bg-white border-slate-100 text-slate-200 hover:bg-emerald-500 hover:text-white hover:border-emerald-400 shadow-slate-100"
                                  )}>
                                      <CheckCircle2 className={cn(
                                        "h-8 w-8 transition-transform group-hover/btn:scale-125",
                                        hasAllergyAlert ? "text-white" : "text-slate-200 group-hover/btn:text-white"
                                      )} />
                                  </button>
                                  <p className={cn(
                                    "text-[9px] font-black text-center mt-2 uppercase tracking-widest",
                                    hasAllergyAlert ? "text-red-600" : "text-slate-300"
                                  )}>
                                    Listo
                                  </p>
                              </form>
                          </div>
                        );
                    })}
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
