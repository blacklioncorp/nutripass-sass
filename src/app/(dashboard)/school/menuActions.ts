'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function addMenuItem(school_id: string, date: string, product_id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('daily_menus').insert({
    school_id,
    date,
    product_id,
  });

  if (error) {
    console.error('Add Menu Error:', error.message);
    throw new Error(error.message);
  }
  revalidatePath('/school/menu');
}

export async function removeMenuItem(menu_id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('daily_menus').delete().eq('id', menu_id);

  if (error) {
    console.error('Remove Menu Error:', error.message);
    throw new Error(error.message);
  }
  revalidatePath('/school/menu');
}
