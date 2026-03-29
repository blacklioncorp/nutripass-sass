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

  const [ { data: dbMenus }, { count: preOrdersCount } ] = await Promise.all([
    supabase
      .from('daily_menus')
      .select('id, date, soup_name, main_course_name, side_dish_name, dessert_name, drink_name, combo_price')
      .eq('school_id', profile.school_id)
      .gte('date', mondayIso)
      .lte('date', fridayIso),
    
    supabase
      .from('pre_orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'paid')
      .or(`order_date.gte.${mondayIso},order_date.lte.${fridayIso}`) // This is bit tricky with OR, better logic below
  ]);

  // Refined count logic: preorders for the menus of this week OR specific items for this week
  const menuIds = (dbMenus || []).map(m => m.id);
  const { count: realCount } = await supabase
    .from('pre_orders')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'paid')
    .or(`daily_menu_id.in.(${menuIds.join(',')}),and(order_date.gte.${mondayIso},order_date.lte.${fridayIso})`);

  // Use DB data or empty array
  const initialMenus: DailyMenu[] = (dbMenus as DailyMenu[]) || [];

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
            <p className="text-[#004B87] font-black text-xl">$70.00</p>
          </div>
          <div className="w-px h-8 bg-[#e8f0f7]" />
          <div className="text-center">
            <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest">Pre-órdenes</p>
            <p className="text-[#004B87] font-black text-xl">{realCount ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Weekly Grid */}
      <WeeklyMenuGrid
        schoolId={profile.school_id}
        initialMenus={initialMenus}
        currentDateStr={currentDateStr}
      />
    </div>
  );
}
