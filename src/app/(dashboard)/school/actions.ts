'use server';

import { createClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getEffectiveSchoolId } from '@/utils/auth/effective-school';

export async function createConsumer(prevState: any, formData: FormData) {
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const identifier = formData.get('identifier') as string;
  const type = formData.get('type') as 'student' | 'staff';
  const grade = formData.get('grade') as string;
  const parentEmail = (formData.get('parentEmail') as string)?.trim().toLowerCase() || null;

  const supabaseAdmin = await createAdminClient();
  const schoolId = await getEffectiveSchoolId();
  if (!schoolId) return { error: 'Escuela no asignada' };

  const { data: consumer, error } = await supabaseAdmin
    .from('consumers')
    .insert({
      school_id: schoolId,
      first_name: firstName,
      last_name: lastName,
      identifier,
      type,
      grade: type === 'student' ? grade : null,
      parent_email: type === 'student' ? parentEmail : null,
      is_active: true
    })
    .select()
    .single();

  if (error) return { error: error.message };

  const { error: walletError } = await supabaseAdmin
    .from('wallets')
    .insert([
      { consumer_id: consumer.id, type: 'comedor', balance: 0.00 },
      { consumer_id: consumer.id, type: 'snack', balance: 0.00 },
    ]);

  if (walletError) return { error: walletError.message };

  revalidatePath('/school/consumers');
  return { success: true, data: consumer };
}

export async function updateConsumer(prevState: any, formData: FormData) {
  const consumerId = formData.get('id') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const identifier = formData.get('identifier') as string;
  const type = formData.get('type') as 'student' | 'staff';
  const grade = formData.get('grade') as string;
  const parentEmail = (formData.get('parentEmail') as string)?.trim().toLowerCase() || null;

  const supabaseAdmin = await createAdminClient();
  const schoolId = await getEffectiveSchoolId();
  if (!schoolId) return { error: 'Profile not found' };

  const { data: consumer, error } = await supabaseAdmin
    .from('consumers')
    .update({
      first_name: firstName,
      last_name: lastName,
      identifier,
      type,
      grade: type === 'student' ? grade : null,
      parent_email: type === 'student' ? parentEmail : null,
    })
    .eq('id', consumerId)
    .eq('school_id', schoolId)
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/school/consumers');
  return { success: true, data: consumer };
}

export async function linkNfcTag(consumerId: string, nfcTagUid: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('consumers')
    .update({ nfc_tag_uid: nfcTagUid })
    .eq('id', consumerId);

  if (error) throw new Error(error.message);
  revalidatePath('/school/consumers');
}

// ─── Report: Detailed Sales Report for Excel Export ──────────────────────────

export type TransactionDetail = {
  folio: string;
  fecha: string;
  hora: string;
  consumidor: string;
  identificador: string;
  producto: string;
  tipo_billetera: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  metodo_pago: string;
};

export async function getDetailedSalesReport(daysBack = 30): Promise<{
  data: TransactionDetail[];
  schoolName: string;
  error?: string;
}> {
  try {
    const adminClient = await createAdminClient();
    const schoolId = await getEffectiveSchoolId();
    if (!schoolId) return { data: [], schoolName: '', error: 'Escuela no asignada' };

    // 0. Get school name
    const { data: school } = await adminClient
      .from('schools')
      .select('name')
      .eq('id', schoolId)
      .single();

    const schoolName = school?.name || 'Mi Escuela';

    // 1. Get all consumers for this school
    const { data: schoolConsumers, error: consumersErr } = await adminClient
      .from('consumers')
      .select('id, first_name, last_name, identifier, type')
      .eq('school_id', schoolId)
      .eq('is_active', true);

    if (consumersErr || !schoolConsumers?.length) return { data: [], schoolName };

    // 2. Consumer lookup map
    const consumerMap: Record<string, { name: string; identifier: string }> = {};
    schoolConsumers.forEach(c => {
      consumerMap[c.id] = {
        name: `${c.first_name} ${c.last_name}`,
        identifier: c.identifier || '—',
      };
    });
    const consumerIds = schoolConsumers.map(c => c.id);

    // 3. Get all wallets for those consumers
    const { data: wallets } = await adminClient
      .from('wallets')
      .select('id, type, consumer_id')
      .in('consumer_id', consumerIds);

    if (!wallets?.length) return { data: [], schoolName };

    const walletMap: Record<string, { consumerId: string; walletType: string }> = {};
    wallets.forEach(w => {
      walletMap[w.id] = { consumerId: w.consumer_id, walletType: w.type };
    });
    const walletIds = wallets.map(w => w.id);

    // 4. Date range (last N days)
    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    const sinceIso = `${since.toISOString().split('T')[0]}T00:00:00.000Z`;

    // 5. Fetch all debit transactions
    const { data: transactions, error: txErr } = await adminClient
      .from('transactions')
      .select('id, wallet_id, amount, type, description, metadata, created_at')
      .in('wallet_id', walletIds)
      .eq('type', 'debit')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (txErr || !transactions?.length) return { data: [], schoolName };

    // 6. Batch resolve product & menu names from metadata
    const productIds = [...new Set(
      transactions.map(t => (t.metadata as any)?.product_id).filter(Boolean)
    )];
    const menuIds = [...new Set(
      transactions.map(t => (t.metadata as any)?.daily_menu_id).filter(Boolean)
    )];

    const [{ data: products }, { data: menus }] = await Promise.all([
      productIds.length > 0
        ? adminClient.from('products').select('id, name, base_price').in('id', productIds)
        : Promise.resolve({ data: [] }),
      menuIds.length > 0
        ? adminClient.from('daily_menus').select('id, main_course_name, combo_price, date').in('id', menuIds)
        : Promise.resolve({ data: [] }),
    ]);

    const productLookup: Record<string, string> = {};
    (products || []).forEach((p: any) => { productLookup[p.id] = p.name; });

    const menuLookup: Record<string, string> = {};
    (menus || []).forEach((m: any) => {
      menuLookup[m.id] = m.main_course_name || 'Combo del Día';
    });

    // 7. Map to TransactionDetail rows
    const rows: TransactionDetail[] = transactions.map((tx: any) => {
      const meta = tx.metadata || {};
      const walletInfo = walletMap[tx.wallet_id];
      const consumer = walletInfo ? consumerMap[walletInfo.consumerId] : null;

      let productName = 'Venta POS';
      if (meta.daily_menu_id && menuLookup[meta.daily_menu_id]) {
        productName = menuLookup[meta.daily_menu_id];
      } else if (meta.product_id && productLookup[meta.product_id]) {
        productName = productLookup[meta.product_id];
      } else if (tx.description) {
        productName = tx.description.replace('Pre-orden: ', '').split(' (')[0];
      }

      const createdAt = new Date(tx.created_at);

      return {
        folio: tx.id.slice(-8).toUpperCase(),
        fecha: createdAt.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        hora: createdAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        consumidor: consumer?.name || '—',
        identificador: consumer?.identifier || '—',
        producto: productName,
        tipo_billetera: walletInfo?.walletType === 'comedor' ? 'Comedor' : 'Snacks',
        cantidad: 1,
        precio_unitario: Math.abs(tx.amount),
        total: Math.abs(tx.amount),
        metodo_pago: meta.source_type === 'pos' ? 'POS / NFC' : 'Billetera Digital',
      };
    });

    return { data: rows, schoolName };
  } catch (e: any) {
    return { data: [], schoolName: '', error: e.message };
  }
}
