'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getStudentStatusByNFC(nfcUid: string) {
  const supabase = await createClient();

  const { data: consumer, error: consumerErr } = await supabase
    .from('consumers')
    .select('id, first_name, last_name, allergies, type, school_id, wallets(id, type, balance)')
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
  config: {
    comedorTotal: number;
    snackTotal: number;
    cartTotal: number;
    wComedorId: string | null;
    wSnackId: string | null;
    fallbackAuthorized: boolean;
  }
) {
  const supabase = await createClient();

  const nutriPointsEarned = newItems.reduce(
    (acc, item) => acc + ((item.nutri_points_reward || 0) * item.quantity),
    0
  );

  try {
    // Need consumer details for school_id and first_name
    const { data: consumerInfo, error: cErr } = await supabase
      .from('consumers')
      .select('school_id, first_name')
      .eq('id', consumerId)
      .single();

    if (cErr || !consumerInfo) throw new Error('Consumidor no encontrado.');

    // Remove fallback logic from backend. It's strictly forbidden now.
    // Call the resilient ATOMIC RPC
    const { data: result, error: rpcError } = await supabase.rpc('smart_pos_checkout', {
      p_consumer_id: consumerId,
      p_school_id: consumerInfo.school_id,
      p_cart_items: newItems,
      p_comedor_total: config.comedorTotal,
      p_snack_total: config.snackTotal,
      p_wallet_comedor_id: config.wComedorId,
      p_wallet_snack_id: config.wSnackId
    });

    if (rpcError) {
      // Map RPC Exceptions to friendly UI errors
      let msg = rpcError.message;
      if (msg.includes('ALERGIA_DETECTADA')) msg = 'BLOQUEO DE SEGURIDAD: El alumno es alérgico a uno o más ingredientes de este carrito. Venta prohibida.';
      if (msg.includes('LIMITE_DIARIO_EXCEDIDO')) msg = 'Rechazado: El padre ha configurado un límite de gasto diario que ha sido superado.';
      if (msg.includes('FONDOS_INSUFICIENTES_COMEDOR')) msg = 'Rechazado: Fondos insuficientes en la cartera COMEDOR.';
      if (msg.includes('FONDOS_INSUFICIENTES_SNACK')) msg = 'Rechazado: Fondos insuficientes en la cartera SNACK.';
      if (msg.includes('SOBREGIRO_SEMANAL_AGOTADO_COMEDOR')) msg = 'Rechazado: Fondo de emergencia semanal del COMEDOR ya fue utilizado.';
      if (msg.includes('SOBREGIRO_SEMANAL_AGOTADO_SNACK')) msg = 'Rechazado: Fondo de emergencia semanal del SNACK ya fue utilizado.';
      throw new Error(msg);
    }

    // Close pre-orders
    if (preOrderIds.length > 0) {
      await supabase.from('pre_orders')
        .update({ status: 'delivered' })
        .in('id', preOrderIds);
    }

    // Award Nutri-Points
    if (nutriPointsEarned > 0) {
      const { data: cData } = await supabase.from('consumers').select('earned_nutri_points').eq('id', consumerId).single();
      if (cData) {
        await supabase.from('consumers').update({ 
          earned_nutri_points: (cData.earned_nutri_points || 0) + nutriPointsEarned 
        }).eq('id', consumerId);
      }
    }

    revalidatePath('/point-of-sale');
    revalidatePath('/school/kitchen');
    revalidatePath('/school/checklist');
    
    return { 
      success: true, 
      result: {
        consumer_name: consumerInfo.first_name || 'Desconocido',
        messages: (result as any)?.messages || ['Cobro procesado correctamente'],
        overdraft_triggered: false // Let UI know success
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
