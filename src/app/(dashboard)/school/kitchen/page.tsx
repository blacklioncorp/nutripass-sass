import { createClient } from '@/utils/supabase/server';

export default async function KitchenReportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user?.id).single();

  if (!profile?.school_id) return <div>Acceso denegado</div>;

  const { data: menus } = await supabase
    .from('daily_menus')
    .select(`
      id, date,
      products ( name ),
      pre_orders ( id )
    `)
    .eq('school_id', profile.school_id)
    .order('date', { ascending: true });

  // Agrupar por fecha
  const groupedTasks: Record<string, any[]> = {};
  menus?.forEach(menu => {
    if (!groupedTasks[menu.date]) groupedTasks[menu.date] = [];
    if (menu.pre_orders.length > 0) {
       groupedTasks[menu.date].push({
         name: (menu.products as any).name,
         count: menu.pre_orders.length
       });
    }
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reporte de Cocina</h1>
        <p className="text-slate-500 mt-2">Sumario de preparación basado en las pre-órdenes pagadas de la semana.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(groupedTasks).map(([date, items]) => (
          <div key={date} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col h-full">
            <h2 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-3 mb-4 uppercase tracking-widest">
              {new Date(date).toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' })}
            </h2>
            
            {items.length === 0 ? (
              <p className="text-slate-400 text-sm flex-1">No hay platillos agendados o pre-ordenados para esta fecha.</p>
            ) : (
              <div className="space-y-4 flex-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-700">{item.name}</span>
                    <span className="bg-primary text-white font-black px-3 py-1 rounded-lg text-lg">
                      {item.count} <span className="text-xs font-medium opacity-80">pzs</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            <button className="w-full mt-6 bg-slate-100 text-slate-500 font-bold py-3 rounded-xl hover:bg-green-100 hover:text-green-700 transition">
              ✔ Marcar Preparado
            </button>
          </div>
        ))}

        {Object.keys(groupedTasks).length === 0 && (
          <div className="col-span-full text-center p-12 bg-white rounded-3xl border border-slate-100 border-dashed">
            <h3 className="text-xl text-slate-500 font-bold">No hay un menú configurado para la semana.</h3>
          </div>
        )}
      </div>
    </div>
  );
}
