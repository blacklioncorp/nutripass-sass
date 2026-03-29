'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export type DailyMenuPayload = {
  date: string;
  soup_name?: string;
  main_course_name?: string;
  side_dish_name?: string;
  dessert_name?: string;
  drink_name?: string;
  combo_price?: number;
};

export async function upsertDailyMenu(schoolId: string, payload: DailyMenuPayload) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('daily_menus')
    .upsert(
      {
        school_id: schoolId,
        date: payload.date,
        soup_name: payload.soup_name,
        main_course_name: payload.main_course_name,
        side_dish_name: payload.side_dish_name,
        dessert_name: payload.dessert_name,
        drink_name: payload.drink_name,
        combo_price: payload.combo_price ?? 70,
      },
      { onConflict: 'school_id,date' }
    );

  if (error) {
    console.error('Upsert daily menu error:', error.message);
    throw new Error(error.message);
  }

  revalidatePath('/school/menu');
}

export async function clearDailyMenu(schoolId: string, date: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('daily_menus')
    .delete()
    .eq('school_id', schoolId)
    .eq('date', date);

  if (error) throw new Error(error.message);
  revalidatePath('/school/menu');
}

// Legacy: keep for backward-compatibility
export async function addMenuItem(school_id: string, date: string, product_id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('daily_menus').upsert(
    { school_id, date, product_id },
    { onConflict: 'school_id,date' }
  );
  if (error) throw new Error(error.message);
  revalidatePath('/school/menu');
}

export async function removeMenuItem(menu_id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('daily_menus').delete().eq('id', menu_id);
  if (error) throw new Error(error.message);
  revalidatePath('/school/menu');
}

export async function copyPreviousWeek(schoolId: string, currentMonday: string) {
  const supabase = await createClient();
  
  // Calculate previous week's Monday and Friday
  const currentMon = new Date(currentMonday + 'T12:00:00');
  const prevMon = new Date(currentMon);
  prevMon.setDate(currentMon.getDate() - 7);
  const prevFri = new Date(prevMon);
  prevFri.setDate(prevMon.getDate() + 4);

  const prevMonIso = prevMon.toISOString().split('T')[0];
  const prevFriIso = prevFri.toISOString().split('T')[0];

  // Fetch previous week's menus
  const { data: prevMenus, error: fetchError } = await supabase
    .from('daily_menus')
    .select('*')
    .eq('school_id', schoolId)
    .gte('date', prevMonIso)
    .lte('date', prevFriIso);

  if (fetchError) throw new Error(fetchError.message);
  if (!prevMenus || prevMenus.length === 0) throw new Error('No se encontró un menú en la semana anterior para copiar.');

  // Map them to current week dates
  const newMenus = prevMenus.map(m => {
    const d = new Date(m.date + 'T12:00:00');
    d.setDate(d.getDate() + 7);
    return {
      school_id: schoolId,
      date: d.toISOString().split('T')[0],
      soup_name: m.soup_name,
      main_course_name: m.main_course_name,
      side_dish_name: m.side_dish_name,
      dessert_name: m.dessert_name,
      drink_name: m.drink_name,
      combo_price: m.combo_price,
      product_id: m.product_id
    };
  });

  const { error: upsertError } = await supabase
    .from('daily_menus')
    .upsert(newMenus, { onConflict: 'school_id,date' });

  if (upsertError) throw new Error(upsertError.message);

  revalidatePath('/school/menu');
}
