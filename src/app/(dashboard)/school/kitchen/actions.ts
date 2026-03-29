'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function markMenuAsPrepared(menuId: string) {
  const supabase = await createClient();
  
  // Actualizar todas las pre-órdenes pagadas de este menú a consumidas
  const { error } = await supabase
    .from('preorders')
    .update({ status: 'consumed' })
    .eq('daily_menu_id', menuId)
    .eq('status', 'paid');
    
  if (error) {
    return { error: error.message };
  }
  
  revalidatePath('/school/kitchen');
  return { success: true };
}
