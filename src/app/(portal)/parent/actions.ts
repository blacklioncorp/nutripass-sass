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

// ─── NEW: Dual-Wallet Pre-Order Checkout ─────────────────────────────────────

type CartItemPayload = {
  id: string;
  name: string;
  price: number;
  date: string;
  walletType: 'comedor' | 'snack';
  sourceType: 'daily_menu' | 'product';
  nutriPoints?: number;
};

export async function createPreOrderTransaction(
  consumerId: string,
  cartItems: CartItemPayload[]
): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const { createAdminClient } = await import('@/utils/supabase/server');
  const adminClient = await createAdminClient();

  // 1. Validate session
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado. Por favor inicia sesión.');

  // 2. Verify the consumer belongs to this parent
  const { data: consumer, error: consumerErr } = await supabase
    .from('consumers')
    .select('id, parent_id, earned_nutri_points, wallets(id, type, balance, max_overdraft)')
    .eq('id', consumerId)
    .eq('parent_id', user.id)
    .single();

  if (consumerErr || !consumer) {
    throw new Error('Alumno no encontrado o sin permisos para esta cuenta.');
  }

  const wallets = (consumer as any).wallets as Array<{
    id: string;
    type: 'comedor' | 'snack';
    balance: number;
    max_overdraft: number;
  }>;

  const comedorWallet = wallets.find(w => w.type === 'comedor');
  const snackWallet = wallets.find(w => w.type === 'snack');

  // 3. Split cart by wallet type
  const comedorItems = cartItems.filter(i => i.walletType === 'comedor');
  const snackItems = cartItems.filter(i => i.walletType === 'snack');

  const comedorTotal = comedorItems.reduce((sum, i) => sum + i.price, 0);
  const snackTotal = snackItems.reduce((sum, i) => sum + i.price, 0);
  const totalPoints = cartItems.reduce((sum, i) => sum + (i.nutriPoints ?? 0), 0);

  // 4. Validate balances (including overdraft allowance)
  if (comedorTotal > 0) {
    if (!comedorWallet) throw new Error('No tienes una Billetera Comedor configurada. Contacta a la escuela.');
    const effectiveLimit = Number(comedorWallet.balance) + Number(comedorWallet.max_overdraft ?? 0);
    if (comedorTotal > effectiveLimit) {
      throw new Error(
        `Saldo insuficiente en billetera Comedor. Saldo actual: $${Number(comedorWallet.balance).toFixed(2)}`
      );
    }
  }

  if (snackTotal > 0) {
    if (!snackWallet) throw new Error('No tienes una Billetera Snack configurada. Contacta a la escuela.');
    const effectiveLimit = Number(snackWallet.balance) + Number(snackWallet.max_overdraft ?? 0);
    if (snackTotal > effectiveLimit) {
      throw new Error(
        `Saldo insuficiente en billetera Snack. Saldo actual: $${Number(snackWallet.balance).toFixed(2)}`
      );
    }
  }

  if (cartItems.length === 0) throw new Error('El carrito está vacío.');

  // Helper: explicit async wrapper so TypeScript is happy with Supabase builders
  const run = async (q: PromiseLike<any>) => q;

  // 5. Build all concurrent operations
  const ops = [
    // Debit comedor wallet
    ...(comedorTotal > 0 && comedorWallet
      ? [run(adminClient
          .from('wallets')
          .update({ balance: Number(comedorWallet.balance) - comedorTotal, updated_at: new Date().toISOString() })
          .eq('id', comedorWallet.id))]
      : []),

    // Debit snack wallet
    ...(snackTotal > 0 && snackWallet
      ? [run(adminClient
          .from('wallets')
          .update({ balance: Number(snackWallet.balance) - snackTotal, updated_at: new Date().toISOString() })
          .eq('id', snackWallet.id))]
      : []),

    // Insert pre_order records for comedor daily_menu items
    ...(comedorItems.length > 0
      ? [run(supabase.from('pre_orders').upsert(
          comedorItems.map(item => ({
            consumer_id: consumerId,
            daily_menu_id: item.id,
            status: 'paid',
            order_date: item.date, // Store the intended consumption date
          }))
        ))]
      : []),

    // Insert pre_order records for snack items (tracking what student gets what product)
    ...(snackItems.length > 0
      ? [run(supabase.from('pre_orders').insert(
          snackItems.map(item => ({
            consumer_id: consumerId,
            product_id: item.id,
            status: 'paid',
            order_date: item.date,
          }))
        ))]
      : []),

    // Decrement stock for snack products
    ...(snackItems.length > 0
      ? snackItems.map(item => 
          run(adminClient.rpc('decrement_product_stock', { 
            p_product_id: item.id, 
            p_quantity: 1 
          }))
        )
      : []),


    // Insert transaction records for comedor items
    ...(comedorItems.length > 0 && comedorWallet
      ? [run(adminClient.from('transactions').insert(
          comedorItems.map(item => ({
            wallet_id: comedorWallet!.id,
            amount: Math.abs(item.price), // Amount should be positive, 'type' handles the sign
            type: 'debit',
            description: `Pre-orden: ${item.name} (${item.date})`,
            metadata: {
              consumer_id: consumerId,
              source_type: 'daily_menu',
              daily_menu_id: item.id,
              date: item.date,
              wallet_type: 'comedor',
              status: 'pendiente_recoger',
            },
          }))
        ))]
      : []),

    // Insert transaction records for snack items
    ...(snackItems.length > 0 && snackWallet
      ? [run(adminClient.from('transactions').insert(
          snackItems.map(item => ({
            wallet_id: snackWallet!.id,
            amount: Math.abs(item.price), // Amount should be positive, 'type' handles the sign
            type: 'debit',
            description: `Pre-orden: ${item.name} (${item.date})`,
            metadata: {
              consumer_id: consumerId,
              source_type: 'product',
              product_id: item.id,
              date: item.date,
              wallet_type: 'snack',
              status: 'pendiente_recoger',
            },
          }))
        ))]
      : []),

    // Add Nutri-points to consumer
    ...(totalPoints > 0
      ? [run(adminClient
          .from('consumers')
          .update({ earned_nutri_points: Number((consumer as any).earned_nutri_points ?? 0) + totalPoints })
          .eq('id', consumerId))]
      : []),
  ];

  // 6. Execute all operations concurrently
  try {
    const results = await Promise.all(ops);
    const failed = results.find((r: any) => r?.error);
    
    if (failed) {
      console.error('[createPreOrderTransaction] Database returned error:', JSON.stringify(failed.error, null, 2));
      throw new Error(`Error de base de datos: ${failed.error.message || 'Error desconocido'}`);
    }
  } catch (err: any) {
    console.error('[createPreOrderTransaction] Unhandled exception:', err);
    throw new Error(err.message || 'Error crítico al procesar la pre-venta.');
  }

  revalidatePath('/parent/menu');
  revalidatePath('/parent/preorders');

  return { success: true };
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
