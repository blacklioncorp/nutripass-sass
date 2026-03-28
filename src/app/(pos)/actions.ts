'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function processPosSale(nfcUid: string, items: any[], total: number) {
  const supabase = await createClient();

  // ── Validar consumer y parent_id ANTES de llamar al RPC ──────────────────
  const { data: consumer, error: consumerErr } = await supabase
    .from('consumers')
    .select('id, parent_id, type, is_active')
    .or(`nfc_tag_uid.eq.${nfcUid},identifier.eq.${nfcUid}`)
    .eq('is_active', true)
    .single();

  if (consumerErr || !consumer) {
    return { error: 'Consumidor no encontrado o inactivo.' };
  }

  // Solo los alumnos tipo 'student' requieren un padre asignado para poder cobrar
  if (consumer.type === 'student' && !consumer.parent_id) {
    return {
      error:
        'Error: El alumno no tiene un padre asignado. No se puede proceder con la venta. Contacta al administrador escolar.',
    };
  }

  // Calcular la recompensa total de Nutri-Puntos de los items del carrito
  const nutriPointsEarned = items.reduce(
    (acc, item) => acc + ((item.nutri_points_reward || 0) * item.quantity),
    0
  );

  // Transformar items de carrito a payload para el RPC
  const payloadItems = items.map(item => ({
    product_id: item.id,
    quantity: item.quantity,
  }));

  const { data, error } = await supabase.rpc('process_pos_sale', {
    p_nfc_uid: nfcUid,
    p_cart_total: total,
    p_nutri_points_earned: nutriPointsEarned,
    p_items: payloadItems,
  });

  if (error) {
    return { error: error.message };
  }

  // Si la compra es exitosa, refrescar inventario y datos
  revalidatePath('/point-of-sale');
  return { success: true, result: data };
}
