import { createClient } from '@/utils/supabase/server';
import PreordersClient from '@/components/portal/PreordersClient';

export const dynamic = 'force-dynamic';

export default async function PreordersRoute() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Acceso denegado</div>;

  // 1. Get ALL linked consumers
  let { data: consumers } = await supabase
    .from('consumers')
    .select('*, wallets(*)')
    .eq('parent_id', user.id)
    .order('first_name');

  // AUTO-LINKING FALLBACK: If no children found by parent_id, try by email
  if ((!consumers || consumers.length === 0) && user.email) {
    const { createAdminClient } = await import('@/utils/supabase/server');
    const adminClient = await createAdminClient();

    await adminClient.from('profiles').upsert(
      { id: user.id, role: 'parent' },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    await adminClient.from('parents').upsert(
      { id: user.id, email: user.email },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    const { data: linkedByEmail } = await adminClient
      .from('consumers')
      .select('*, wallets(*)')
      .eq('parent_email', user.email.toLowerCase());

    if (linkedByEmail && linkedByEmail.length > 0) {
      const toLink = linkedByEmail.filter((c: any) => c.parent_id !== user.id);
      if (toLink.length > 0) {
        await adminClient
          .from('consumers')
          .update({ parent_id: user.id })
          .in('id', toLink.map((c: any) => c.id));
      }
      consumers = linkedByEmail;
    }
  }

  if (!consumers || consumers.length === 0) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-4">Reserva Semanal</h1>
        <h2 className="text-xl font-black text-slate-900">No tienes alumnos vinculados aún.</h2>
        <p className="text-slate-500 font-medium mt-2">Contacta a la escuela para que vinculen a tu hijo a esta cuenta de correo.</p>
      </div>
    );
  }

  const schoolIds = Array.from(new Set(consumers.map((c: any) => c.school_id)));
  const consumerIds = consumers.map((c: any) => c.id);

  const { createAdminClient } = await import('@/utils/supabase/server');
  const adminClient = await createAdminClient();

  // 2. Concurrent fetches: daily menus + snack/bebida products + existing pre_orders
  const results = await Promise.all([
    supabase
      .from('daily_menus')
      .select(`
        id, date, product_id, school_id,
        combo_price, soup_name, main_course_name, side_dish_name, dessert_name, drink_name,
        products ( id, name, description, base_price, image_url, nutri_points_reward )
      `)
      .in('school_id', schoolIds)
      .order('date', { ascending: true }),

    adminClient
      .from('products')
      .select('id, school_id, name, description, base_price, category, image_url, is_available, stock_quantity, nutri_points_reward')
      .in('school_id', schoolIds)
      .in('category', ['snack', 'bebida', 'comedor'])
      .eq('is_available', true)
      .order('name'),

    supabase
      .from('pre_orders')
      .select('id, daily_menu_id, product_id, consumer_id, status')
      .in('consumer_id', consumerIds)
      .eq('status', 'paid'),
  ]);

  const dailyMenus = results[0].data || [];
  const products = results[1].data || [];
  const existingPreorders = results[2].data || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-40 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black text-[#004B87] tracking-tight">Reserva Semanal</h1>
        <p className="text-[#7CB9E8] font-medium mt-1">Combos del comedor y snacks — todo en una sola pre-venta.</p>
      </div>

      <PreordersClient
        initialConsumers={consumers}
        dailyMenus={dailyMenus}
        existingPreorders={existingPreorders}
        products={products}
      />
    </div>
  );
}
