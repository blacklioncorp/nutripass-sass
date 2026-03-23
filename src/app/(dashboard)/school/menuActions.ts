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
