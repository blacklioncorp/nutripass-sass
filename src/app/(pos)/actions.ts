'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getStudentStatusByNFC(nfcUid: string) {
  const supabase = await createClient();

  const { data: consumer, error: consumerErr } = await supabase
    .from('consumers')
    .select('id, first_name, last_name, allergies, type, school_id, wallets(type, balance)')
    .or(`nfc_tag_uid.eq.${nfcUid},identifier.eq.${nfcUid}`)
    .eq('is_active', true)
    .single();

  if (consumerErr || !consumer) {
    return { error: 'Consumidor no encontrado o inactivo.' };
  }

  // Fetch today's pre-orders
  const today = new Date().toISOString().split('T')[0];
  const { data: preOrders } = await supabase
    .from('pre_orders')
    .select(`
      id, 
      status, 
      order_date,
      daily_menus ( main_course_name ),
      products ( name )
    `)
    .eq('consumer_id', (consumer as any).id)
    .eq('order_date', today)
    .eq('status', 'paid');

  return { 
    success: true, 
    consumer, 
    todayPreOrders: (preOrders || []).map(po => ({
      id: po.id,
      name: (po.products as any)?.name || (po.daily_menus as any)?.main_course_name || 'Menú del Día'
    }))
  };
}

export async function processSmartCheckout(
  consumerId: string, 
  preOrderIds: string[], 
  newItems: any[], 
  total: number
) {
  const supabase = await createClient();

  const nutriPointsEarned = newItems.reduce(
    (acc, item) => acc + ((item.nutri_points_reward || 0) * item.quantity),
    0
  );

  const payloadItems = newItems.map(item => ({
    product_id: item.id,
    quantity: item.quantity,
    price: item.base_price
  }));

  const { data, error } = await supabase.rpc('smart_pos_checkout', {
    p_consumer_id: consumerId,
    p_pre_order_ids: preOrderIds,
    p_cart_total: total,
    p_nutri_points_earned: nutriPointsEarned,
    p_items: payloadItems,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/point-of-sale');
  revalidatePath('/school/kitchen');
  revalidatePath('/school/checklist');
  
  return { success: true, result: data };
}
