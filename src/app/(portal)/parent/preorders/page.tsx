import { createClient } from '@/utils/supabase/server';
import WeeklyPreOrder from '@/components/portal/WeeklyPreOrder';

export default async function PreordersRoute() {
  const supabase = await createClient();

  // 1. Get logged-in parent
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Acceso denegado</div>;

  // 2. Get their child (we assume the first consumer where parent_id = user.id)
  const { data: consumers } = await supabase
    .from('consumers')
    .select('*, wallets(*)')
    .eq('parent_id', user.id);

  const activeConsumer = consumers?.[0];

  if (!activeConsumer) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-xl font-bold">No tienes alumnos vinculados aún.</h2>
        <p className="text-slate-500">Contacta a la escuela para que vinculen a tu hijo a esta cuenta de correo.</p>
      </div>
    );
  }

  // 3. Get the active daily menus for this school (ideally filtered by >= today, here we just fetch all for prototype)
  const { data: dailyMenus } = await supabase
    .from('daily_menus')
    .select(`
      id, date, product_id,
      products ( id, name, description, base_price, image_url )
    `)
    .eq('school_id', activeConsumer.school_id)
    .order('date', { ascending: true });

  // 4. Get existing preorders for this consumer to mark them as paid
  const { data: existingPreorders } = await supabase
    .from('pre_orders')
    .select('daily_menu_id, consumer_id')
    .eq('consumer_id', activeConsumer.id);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Menú Semanal</h1>
        <p className="text-slate-500 mt-2">Evita filas y asegura la comida de tu hijo pre-ordenando para los próximos días.</p>
      </div>

      <WeeklyPreOrder 
        consumer={activeConsumer} 
        dailyMenus={dailyMenus || []} 
        existingPreorders={existingPreorders || []} 
      />
    </div>
  );
}
