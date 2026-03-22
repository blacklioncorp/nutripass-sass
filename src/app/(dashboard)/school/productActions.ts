'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function upsertProduct(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();
  if (!profile?.school_id) return { error: 'No autorizado' };

  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const category = formData.get('category') as string;
  const base_price = parseFloat(formData.get('basePrice') as string);
  const stock_quantity = parseInt(formData.get('stockQuantity') as string) || 0;
  const nutri_points_reward = parseInt(formData.get('nutriPoints') as string) || 0;

  const showsStock = category === 'snack' || category === 'bebida';

  const payload = {
    school_id: profile.school_id,
    name,
    category,
    base_price,
    stock_quantity: showsStock ? stock_quantity : null,
    nutri_points_reward,
    is_available: true
  };

  if (id) {
    const { error } = await supabase.from('products').update(payload).eq('id', id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('products').insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath('/school/products');
  return { success: true };
}
