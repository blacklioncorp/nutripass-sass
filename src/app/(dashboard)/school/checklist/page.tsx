import { createClient } from '@/utils/supabase/server';
import { Package, Calendar, CheckCircle2 } from 'lucide-react';

export default async function ChecklistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user?.id).single();

  if (!profile?.school_id) return <div>Acceso denegado</div>;

  // Fetch pre_orders that are snacks (product_id is NOT NULL)
  const { data: snackOrders } = await supabase
    .from('pre_orders')
    .select(`
      id, order_date, status,
      products ( name, category ),
      consumers ( first_name, last_name, allergies )
    `)
    .not('product_id', 'is', null)
    .eq('status', 'paid')
    .order('order_date', { ascending: true });

  // Group by date
  const groupedDates: Record<string, any[]> = {};
  snackOrders?.forEach(order => {
    if (!groupedDates[order.order_date!]) groupedDates[order.order_date!] = [];
    groupedDates[order.order_date!].push(order);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Checklist de Cafetería</h1>
        <p className="text-slate-500 mt-2">Seguimiento de entrega de snacks y bebidas pre-pagados.</p>
      </div>

      {Object.entries(groupedDates).length === 0 ? (
        <div className="text-center p-12 bg-white rounded-3xl border border-slate-100 border-dashed">
          <div className="text-6xl mb-4">🥨</div>
          <h3 className="text-xl text-slate-500 font-bold">No hay snacks pendientes por entregar.</h3>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((order) => (
                  <div key={order.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Alumno</span>
                        <span className="font-bold text-slate-800">
                          {(order.consumers as any).first_name} {(order.consumers as any).last_name}
                        </span>
                      </div>
                      <div className="bg-amber-100 px-2 py-1 rounded-lg text-[10px] font-black text-amber-700 uppercase">
                        {(order.products as any).category}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <Package className="h-4 w-4 text-slate-400" />
                      <span className="font-black text-slate-700 text-sm">{(order.products as any).name}</span>
                    </div>

                    {(order.consumers as any).allergies?.length > 0 && (
                      <div className="bg-red-50 p-2 rounded-lg border border-red-100">
                         <span className="text-[10px] font-black text-red-600 uppercase flex items-center gap-1">
                            ⚠️ Alergias: {(order.consumers as any).allergies.join(', ')}
                         </span>
                      </div>
                    )}

                    <form action={async () => {
                      'use server';
                      const { createClient: createAdmin } = await import('@/utils/supabase/server');
                      const supabaseAdmin = await createAdmin();
                      await supabaseAdmin.from('pre_orders').update({ status: 'consumed' }).eq('id', order.id);
                    }}>
                      <button type="submit" className="w-full h-10 bg-slate-100 text-slate-400 font-black rounded-xl hover:bg-green-500 hover:text-white transition-all flex items-center justify-center gap-2 text-sm group">
                        <CheckCircle2 className="h-4 w-4 opacity-30 group-hover:opacity-100" />
                        Marcar Entregado
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
