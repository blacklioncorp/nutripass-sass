import { createClient } from '@/utils/supabase/server';
import PreordersClient from '@/components/portal/PreordersClient';

export default async function PreordersRoute() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Acceso denegado</div>;

  // 1. Get ALL linked consumers
  const { data: consumers } = await supabase
    .from('consumers')
    .select('*, wallets(*)')
    .eq('parent_id', user.id)
    .order('first_name');

  if (!consumers || consumers.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Menú Semanal</h1>
        <h2 className="text-xl font-black text-slate-900">No tienes alumnos vinculados aún.</h2>
        <p className="text-slate-500 font-medium mt-2">Contacta a la escuela para que vinculen a tu hijo a esta cuenta de correo.</p>
      </div>
    );
  }

  // 2. Get daily menus for all schools involved
  const schoolIds = Array.from(new Set(consumers.map(c => c.school_id)));
  const { data: dailyMenus } = await supabase
    .from('daily_menus')
    .select(`
      id, date, product_id, school_id,
      products ( id, name, description, base_price, image_url )
    `)
    .in('school_id', schoolIds)
    .order('date', { ascending: true });

  // 3. Get existing preorders for all consumers
  const consumerIds = consumers.map(c => c.id);
  const { data: existingPreorders } = await supabase
    .from('pre_orders')
    .select('daily_menu_id, consumer_id')
    .in('consumer_id', consumerIds);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black text-[#004B87] tracking-tight">Menú Semanal</h1>
        <p className="text-[#7CB9E8] font-medium mt-1">Asegura la comida de tus hijos pre-ordenando para los próximos días.</p>
      </div>

      <PreordersClient 
        initialConsumers={consumers} 
        dailyMenus={dailyMenus || []} 
        existingPreorders={existingPreorders || []} 
      />
    </div>
  );
}
