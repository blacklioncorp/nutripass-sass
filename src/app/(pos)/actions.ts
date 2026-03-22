'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function processPosSale(nfcUid: string, items: any[], total: number) {
  const supabase = await createClient();
  
  // Calcular la recompensa total de Nutri-Puntos de los items del carrito
  const nutriPointsEarned = items.reduce((acc, item) => acc + ((item.nutri_points_reward || 0) * item.quantity), 0);
  
  // Transformar items de carrito a payload para el RPC
  const payloadItems = items.map(item => ({
    product_id: item.id,
    quantity: item.quantity
  }));

  const { data, error } = await supabase.rpc('process_pos_sale', {
    p_nfc_uid: nfcUid,
    p_cart_total: total,
    p_nutri_points_earned: nutriPointsEarned,
    p_items: payloadItems
  });

  if (error) {
    return { error: error.message };
  }

  // Si la compra es exitosa, refrescar inventario y datos
  revalidatePath('/point-of-sale');
  return { success: true, result: data };
}
