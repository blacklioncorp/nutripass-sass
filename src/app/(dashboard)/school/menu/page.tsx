import { createClient } from '@/utils/supabase/server';
import WeeklyMenuGrid from '@/components/school/WeeklyMenuGrid';
import type { DailyMenu } from '@/components/school/WeeklyMenuGrid';

// ─── Mock "Lunes": Sopa de pasta, Tacos dorados, Ensalada, Fruta, Jamaica ────
function getMondayOfCurrentWeek() {
  const today = new Date();
  const day = today.getDay() === 0 ? 7 : today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + 1);
  return monday.toISOString().split('T')[0];
}

const SEED_MOCK: DailyMenu = {
  date: getMondayOfCurrentWeek(),
  soup_name: 'Sopa de pasta',
  main_course_name: 'Tacos dorados',
  side_dish_name: 'Ensalada César',
  dessert_name: 'Fruta de temporada',
  drink_name: 'Jamaica',
  combo_price: 70,
};

// ─── Server Component ─────────────────────────────────────────────────────────
export default async function MenuRoute() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user?.id)
    .single();

  if (!profile?.school_id) {
    return (
      <div className="bg-white rounded-2xl p-16 text-center border border-red-100">
        <p className="text-red-400 font-bold">Acceso denegado — perfil sin escuela asignada.</p>
      </div>
    );
  }

  // Fetch this week's menus from DB
  const today = new Date();
  const day = today.getDay() === 0 ? 7 : today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - day + 1);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const { data: dbMenus } = await supabase
    .from('daily_menus')
    .select('id, date, soup_name, main_course_name, side_dish_name, dessert_name, drink_name, combo_price')
    .eq('school_id', profile.school_id)
    .gte('date', monday.toISOString().split('T')[0])
    .lte('date', friday.toISOString().split('T')[0]);

  // Use DB data if available, fallback to seeded Monday mock
  const initialMenus: DailyMenu[] = dbMenus && dbMenus.length > 0
    ? (dbMenus as DailyMenu[])
    : [SEED_MOCK];

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
            <p className="text-[#004B87] font-black text-xl">—</p>
          </div>
        </div>
      </div>

      {/* Weekly Grid */}
      <WeeklyMenuGrid
        schoolId={profile.school_id}
        initialMenus={initialMenus}
      />
    </div>
  );
}
