import { createClient } from '@/utils/supabase/server';
import PreordersClient from '@/components/portal/PreordersClient';
import { CalendarDays } from 'lucide-react';

export const metadata = {
  title: 'Reserva Semanal — NutriPass',
  description: 'Pre-ordena los alimentos de tus hijos para la semana, incluyendo combos y snacks.',
};

export const dynamic = 'force-dynamic';

export default async function MenuPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Acceso denegado</div>;
  }

  // 1. Fetch all students linked to this parent
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
      <div className="p-12 text-center bg-white rounded-3xl border border-[#e8f0f7] shadow-sm">
        <CalendarDays className="h-14 w-14 text-[#e8f0f7] mx-auto mb-4" />
        <h1 className="text-3xl font-black text-[#004B87] tracking-tight mb-2">Reserva Semanal</h1>
        <h2 className="text-lg font-bold text-slate-600">No tienes alumnos vinculados aún.</h2>
        <p className="text-slate-400 font-medium mt-2 max-w-sm mx-auto">
          Solicita a la escuela que asocie la matrícula de tu hijo a esta cuenta de correo.
        </p>
      </div>
    );
  }

  const schoolIds = Array.from(new Set(consumers.map((c) => c.school_id)));

  // 2. Fetch all data concurrently: daily_menus, products (snacks/bebidas), and existing pre_orders
  const consumerIds = consumers.map((c) => c.id);

  const [{ data: dailyMenus }, { data: products }, { data: existingPreorders }] = await Promise.all([
    supabase
      .from('daily_menus')
      .select(`
        id, date, product_id, school_id,
        combo_price, soup_name, main_course_name, side_dish_name, dessert_name, drink_name,
        products ( id, name, description, base_price, image_url )
      `)
      .in('school_id', schoolIds)
      .order('date', { ascending: true }),

    supabase
      .from('products')
      .select('id, school_id, name, description, base_price, category, image_url, is_available, stock_quantity, nutri_points_reward')
      .in('school_id', schoolIds)
      .in('category', ['snack', 'bebida'])
      .eq('is_available', true)
      .order('name'),

    supabase
      .from('pre_orders')
      .select('daily_menu_id, consumer_id')
      .in('consumer_id', consumerIds),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-40 animate-in fade-in duration-500">
      <div>
        <h1 className="text-4xl font-black text-[#004B87] tracking-tight">Reserva Semanal</h1>
        <p className="text-[#7CB9E8] font-medium mt-1">
          Combos del comedor y snacks — todo en una sola pre-venta.
        </p>
      </div>

      <PreordersClient
        initialConsumers={consumers}
        dailyMenus={dailyMenus || []}
        existingPreorders={existingPreorders || []}
        products={products || []}
      />
    </div>
  );
}
