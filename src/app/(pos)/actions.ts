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

  let overdraft_triggered = false;
  let chargeComedor = config.comedorTotal;
  let chargeSnack = config.snackTotal;

  // Manual fallback calculation
  if (config.wComedorId && config.wSnackId && config.fallbackAuthorized) {
    const { data: wCData } = await supabase.from('wallets').select('balance').eq('id', config.wComedorId).single();
    if (wCData && chargeComedor > wCData.balance) {
      const faltante = chargeComedor - wCData.balance;
      chargeComedor = wCData.balance;
      chargeSnack += faltante;
    }
    
    // In actual fallback from Snack to Comedor (rare but possible based on our generic handling)
    const { data: wSData } = await supabase.from('wallets').select('balance').eq('id', config.wSnackId).single();
    if (wSData && chargeSnack > wSData.balance && config.fallbackAuthorized) {
      const faltante = chargeSnack - wSData.balance;
      chargeSnack = wSData.balance;
      chargeComedor += faltante;
    }
  }

  // Define checkout messages
  const messages: string[] = [];

  // Charge Comedor
  let newComedorBalance = 0;
  if (config.wComedorId && chargeComedor > 0) {
    const { data: wData } = await supabase.from('wallets').select('balance, max_overdraft').eq('id', config.wComedorId).single();
    if (wData) {
      newComedorBalance = Number(wData.balance) - chargeComedor;
      if (newComedorBalance < 0) overdraft_triggered = true;
      await supabase.from('wallets').update({ balance: newComedorBalance }).eq('id', config.wComedorId);
      await supabase.from('transactions').insert({
        wallet_id: config.wComedorId,
        amount: -chargeComedor,
        type: 'purchase',
        description: 'Compra en POS - Comida/Desayuno'
      });
      messages.push(`Cargo realizado a billetera COMEDOR: $${chargeComedor.toFixed(2)}`);
    }
  }

  // Charge Snacks
  let newSnackBalance = 0;
  if (config.wSnackId && chargeSnack > 0) {
    const { data: wData } = await supabase.from('wallets').select('balance, max_overdraft').eq('id', config.wSnackId).single();
    if (wData) {
      newSnackBalance = Number(wData.balance) - chargeSnack;
      if (newSnackBalance < 0) overdraft_triggered = true;
      await supabase.from('wallets').update({ balance: newSnackBalance }).eq('id', config.wSnackId);
      await supabase.from('transactions').insert({
        wallet_id: config.wSnackId,
        amount: -chargeSnack,
        type: 'purchase',
        description: 'Compra en POS - Snacks/Bebidas'
      });
      messages.push(`Cargo realizado a billetera SNACKS: $${chargeSnack.toFixed(2)}`);
    }
  }

  // Close pre-orders
  if (preOrderIds.length > 0) {
    await supabase.from('pre_orders')
      .update({ status: 'delivered' })
      .in('id', preOrderIds);
  }

  // Award Nutri-Points
  if (nutriPointsEarned > 0) {
    const { data: cData } = await supabase.from('consumers').select('earned_nutri_points, first_name').eq('id', consumerId).single();
    if (cData) {
      await supabase.from('consumers').update({ 
        earned_nutri_points: (cData.earned_nutri_points || 0) + nutriPointsEarned 
      }).eq('id', consumerId);
    }
  }

  const { data: consumerData } = await supabase.from('consumers').select('first_name').eq('id', consumerId).single();

  revalidatePath('/point-of-sale');
  revalidatePath('/school/kitchen');
  revalidatePath('/school/checklist');
  
  return { 
    success: true, 
    result: {
      consumer_name: consumerData?.first_name || 'Desconocido',
      messages,
      overdraft_triggered
    }
  };
}
