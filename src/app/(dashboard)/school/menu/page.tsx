import { createClient } from '@/utils/supabase/server';
import MenuPlanner from '@/components/school/MenuPlanner';

export default async function MenuRoute() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user?.id).single();
  
  if (!profile?.school_id) return <div>Acceso denegado</div>;

  // Fetch Catalog where it belongs to this school
  const { data: catalog } = await supabase
    .from('products')
    .select('*')
    .eq('school_id', profile.school_id)
    .eq('is_available', true);

  // Fetch Current Daily Menus along with populated Product info
  const { data: currentMenus } = await supabase
    .from('daily_menus')
    .select(`
      id,
      date,
      products (
        id, name, base_price, image_url
      )
    `)
    .eq('school_id', profile.school_id);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-[#8aa8cc] font-bold text-xs uppercase tracking-widest mb-1">PLANIFICADOR MENÚ</p>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧑‍🍳</span>
            <h1 className="text-4xl font-black tracking-tight">
              <span className="text-[#1a3a5c]">Planificador </span>
              <span className="text-[#3b82f6]">Mata-Mermas</span>
            </h1>
          </div>
          <p className="text-[#8aa8cc] font-medium mt-1 text-sm">Diseña la experiencia gastronomica de tus alumnos. Define los platillos del comedor para optimizar la producción.</p>
        </div>
        <div className="bg-white border border-[#e8f0f7] rounded-2xl px-6 py-4 text-sm shadow-sm flex items-center gap-3">
          <span className="text-[#3b82f6] text-lg">ⓘ</span>
          <div>
            <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest">PRÓXIMA SEMANA</p>
            <p className="text-[#4a6fa5] font-semibold text-xs">Las reservas se cierran los Domingos a las 10 PM.</p>
          </div>
        </div>
      </div>
      <MenuPlanner 
        schoolId={profile.school_id} 
        catalog={catalog || []} 
        currentMenus={currentMenus || []} 
      />
    </div>
  );
}
