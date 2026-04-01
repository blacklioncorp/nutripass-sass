import { createClient } from '@/utils/supabase/server';
import { getEffectiveSchoolId } from '@/utils/auth/effective-school';
import WeeklyMenuGrid from '@/components/school/WeeklyMenuGrid';
import type { DailyMenu } from '@/components/school/WeeklyMenuGrid';

export default async function MenuRoute(props: { searchParams?: Promise<{ date?: string }> }) {
  const supabase = await createClient();
  const schoolId = await getEffectiveSchoolId();

  if (!schoolId) {
    return (
      <div className="bg-white rounded-2xl p-16 text-center border border-red-100">
        <p className="text-red-400 font-bold">Acceso denegado — perfil sin escuela asignada.</p>
      </div>
    );
  }

  // Next.js 15 requires awaiting searchParams if it's dynamic
  const searchParams = props.searchParams ? await props.searchParams : {};
  
  // Fetch this week's menus from DB based on date param or today
  const currentDateStr = searchParams.date || new Date().toISOString().split('T')[0];
  const refDate = new Date(currentDateStr + 'T12:00:00'); // Use T12:00:00 to avoid timezone shifting

  const day = refDate.getDay() === 0 ? 7 : refDate.getDay();
  const monday = new Date(refDate);
  monday.setDate(refDate.getDate() - day + 1);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const mondayIso = monday.toISOString().split('T')[0];
  const fridayIso = friday.toISOString().split('T')[0];

  const { createAdminClient } = await import('@/utils/supabase/server');
  const adminClient = await createAdminClient();

  const [ { data: dbMenus } ] = await Promise.all([
    supabase
      .from('daily_menus')
      .select('id, date, soup_name, main_course_name, side_dish_name, dessert_name, drink_name, combo_price')
      .eq('school_id', schoolId)
      .gte('date', mondayIso)
      .lte('date', fridayIso),
  ]);

  // Get all consumer IDs for this school to properly scope pre-order counts
  const { data: schoolConsumers } = await adminClient
    .from('consumers')
    .select('id')
    .eq('school_id', schoolId);
  const consumerIds = (schoolConsumers || []).map(c => c.id);

  // Count pre_orders for this week scoped to this school's consumers
  const menuIds = (dbMenus || []).map(m => m.id);
  
  let realCount = 0;
  if (menuIds.length > 0) {
    const { count: byMenu } = await adminClient
      .from('pre_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'paid')
      .in('daily_menu_id', menuIds);
    realCount += byMenu ?? 0;
  }

  // Count snack orders: use created_at range since order_date is NULL for snacks created before the migration
  if (consumerIds.length > 0) {
    const weekStartISO = mondayIso + 'T00:00:00.000Z';
    const weekEndISO = fridayIso + 'T23:59:59.999Z';
    const { count: byDate } = await adminClient
      .from('pre_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'paid')
      .not('product_id', 'is', null)
      .in('consumer_id', consumerIds)
      .or(`order_date.gte.${mondayIso},and(order_date.is.null,created_at.gte.${weekStartISO})`)
      .lte('created_at', weekEndISO);
    realCount += byDate ?? 0;
  }

  // Use DB data or empty array
  const initialMenus: DailyMenu[] = (dbMenus as DailyMenu[]) || [];

  // Get average combo price from this week's menus (fallback to 70)
  const avgComboPrice = dbMenus && dbMenus.length > 0
    ? (dbMenus as any[]).reduce((sum, m) => sum + Number(m.combo_price ?? 70), 0) / dbMenus.length
    : 70;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-[#8aa8cc] font-black text-xs uppercase tracking-widest mb-1">DASHBOARD ESCOLAR</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧑‍🍳</span>
            <h1 className="text-4xl font-black tracking-tight">
              <span className="text-[#1a3a5c]">Planificador </span>
              <span className="text-[#3b82f6]">Semanal</span>
            </h1>
          </div>
          <p className="text-[#8aa8cc] font-medium mt-1 text-sm">
            Configura el menú combinado de 5 tiempos para cada día escolar.
          </p>
        </div>

        {/* Stats strip */}
        <div className="bg-white border border-[#e8f0f7] rounded-2xl px-6 py-4 shadow-sm flex items-center gap-5 text-sm">
          <div className="text-center">
            <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest">Precio Combo</p>
            <p className="text-[#004B87] font-black text-xl">${avgComboPrice.toFixed(2)}</p>
          </div>
          <div className="w-px h-8 bg-[#e8f0f7]" />
          <div className="text-center">
            <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest">Pre-órdenes</p>
            <p className="text-[#004B87] font-black text-xl">{realCount}</p>
          </div>
        </div>
      </div>

      {/* Weekly Grid */}
      <WeeklyMenuGrid
        schoolId={schoolId}
        initialMenus={initialMenus}
        currentDateStr={currentDateStr}
      />
    </div>
  );
}
