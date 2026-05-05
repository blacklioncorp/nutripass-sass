'use server';

import { createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export interface RefundResult {
  success: boolean;
  consumer_name?: string;
  comedor_balance?: number;
  snack_balance?: number;
  gross_balance?: number;
  admin_fee?: number;
  refund_amount?: number;
  had_overdraft?: boolean;
  error?: string;
}

/**
 * processRefund
 * Calls the process_account_refund RPC which atomically:
 *  1. Zeroes out both wallets
 *  2. Inserts 'refund' transactions
 *  3. Closes wallets + consumer account
 *  4. Returns the net refund amount for the Stripe manual step
 */
export async function processRefund(consumerId: string): Promise<RefundResult> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase.rpc('process_account_refund', {
    p_consumer_id: consumerId,
  });

  if (error) {
    const msg = error.message || 'Error desconocido al procesar el reembolso.';
    // Map known SQL exceptions to user-friendly messages
    if (msg.includes('CONSUMER_NOT_FOUND')) {
      return { success: false, error: 'Alumno no encontrado en la base de datos.' };
    }
    return { success: false, error: msg };
  }

  // Revalidate the refunds page so the row disappears after liquidation
  revalidatePath('/master/refunds');

  return data as RefundResult;
}

/**
 * markCancellationRequested
 * Sets a consumer's status to 'cancellation_requested' — called from a future
 * parent-facing "Request Account Closure" form or manually by an admin.
 */
export async function markCancellationRequested(consumerId: string): Promise<{ error?: string }> {
  const supabase = await createAdminClient();

  const { error } = await supabase
    .from('consumers')
    .update({
      status: 'cancellation_requested',
      cancellation_requested_at: new Date().toISOString(),
    })
    .eq('id', consumerId);

  if (error) return { error: error.message };

  revalidatePath('/master/refunds');
  return {};
}
