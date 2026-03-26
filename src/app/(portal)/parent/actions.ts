'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateAllergies(consumerId: string, allergies: string[]) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('consumers')
    .update({ allergies })
    .eq('id', consumerId);

  if (error) throw new Error(error.message);

  revalidatePath('/parent');
}

export async function updateParentProfile(userId: string, fullName: string, email?: string) {
  const supabase = await createClient();

  // Perform UPSERT into 'parents' table
  // We include email if provided, otherwise we just update full_name
  const { error } = await supabase
    .from('parents')
    .upsert({ 
      id: userId, 
      full_name: fullName,
      ...(email ? { email } : {})
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error updating parent profile:', error);
    throw new Error(`Error de Supabase: ${error.message}`);
  }

  revalidatePath('/parent');
}

export async function processPreorderCheckout(
  consumerId: string,
  walletId: string,
  menuIds: string[],
  total: number
): Promise<{ success: boolean; overdraft: boolean }> {
  const supabase = await createClient();

  // Fetch current wallet balance
  const { data: wallet, error: walletErr } = await supabase
    .from('wallets')
    .select('balance, max_overdraft')
    .eq('id', walletId)
    .single();

  if (walletErr || !wallet) throw new Error('Billetera no encontrada');

  const newBalance = Number(wallet.balance) - total;
  const maxOverdraft = Number((wallet as any).max_overdraft ?? 0);
  const overdraft = newBalance < 0;

  if (newBalance < -maxOverdraft) {
    throw new Error('Saldo insuficiente. No se puede completar la pre-orden.');
  }

  // Deduct wallet balance
  const { error: updateErr } = await supabase
    .from('wallets')
    .update({ balance: newBalance })
    .eq('id', walletId);

  if (updateErr) throw new Error(updateErr.message);

  // Mark each daily_menu as pre-ordered
  const preorders = menuIds.map((daily_menu_id) => ({
    consumer_id: consumerId,
    daily_menu_id,
    status: 'paid',
  }));

  const { error: poError } = await supabase
    .from('preorders')
    .upsert(preorders, { onConflict: 'consumer_id,daily_menu_id' });

  if (poError) throw new Error(poError.message);

  // Log one transaction per menu item
  const txs = menuIds.map(() => ({
    consumer_id: consumerId,
    wallet_id: walletId,
    amount: -(total / menuIds.length),
    transaction_type: 'purchase',
    description: 'Pre-orden semanal',
    wallet_type: 'comedor',
  }));

  await supabase.from('transactions').insert(txs);

  revalidatePath('/parent');
  revalidatePath('/parent/preorders');

  return { success: true, overdraft };
}

export async function submitInvoiceRequest(data: {
  transaction_id: string;
  rfc: string;
  razon_social: string;
  codigo_postal: string;
  regimen_fiscal: string;
  uso_cfdi: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Usuario no autenticado');

  const { error } = await supabase
    .from('invoice_requests')
    .insert({
      user_id: user.id,
      ...data
    });

  if (error) throw new Error(error.message);

  revalidatePath('/parent');
  return { success: true };
}
