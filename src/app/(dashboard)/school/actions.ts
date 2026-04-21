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

export async function importConsumersAction(consumers: any[]) {
  try {
    const adminClient = await createAdminClient();
    const schoolId = await getEffectiveSchoolId();
    if (!schoolId) throw new Error('Escuela no identificada o sin permisos.');

    // 1. Fetch school settings for domain filtering
    const { data: school } = await adminClient
      .from('schools')
      .select('name, settings')
      .eq('id', schoolId)
      .single();

    const restrictedDomains = school?.settings?.operational?.restricted_domains || [];
    const schoolName = school?.name || 'Mi Escuela';

    // 2. Pre-fetch existing parents to perform linking
    const parentEmails = [...new Set(
      consumers
        .map(c => c.parent_email)
        .filter(Boolean)
        .map(e => e.toLowerCase().trim())
    )];
    
    let parentMap: Record<string, string> = {};
    if (parentEmails.length > 0) {
      const { data: existingParents } = await adminClient
        .from('parents')
        .select('id, email')
        .in('email', parentEmails);
      
      existingParents?.forEach(p => {
        parentMap[p.email.toLowerCase()] = p.id;
      });
    }

    // 3. Prepare consumer data & Collect n8n candidates
    let stats = {
      newStudents: consumers.length,
      linkedParents: 0,
      preLinkedParents: 0,
      skippedEmails: 0,
      whatsappCandidates: 0
    };

    const n8nPayloads: any[] = [];

    const dataToInsert = consumers.map(c => {
      const email = c.parent_email?.toLowerCase().trim() || null;
      const phone = c.parent_phone || null;
      const isRestricted = email && restrictedDomains.some((d: string) => email.endsWith(d.toLowerCase()));
      
      const parentId = email ? parentMap[email] : null;
      
      if (parentId) stats.linkedParents++;
      else if (email) stats.preLinkedParents++;
      
      const shouldNotifyWhatsApp = (isRestricted || !email) && !!phone;
      if (shouldNotifyWhatsApp) stats.whatsappCandidates++;

      const metadata = {
        ...(isRestricted ? { skip_email_invite: true, reason: 'restricted_domain' } : {}),
        ...(shouldNotifyWhatsApp ? { whatsapp_pending: true } : {})
      };

      if (shouldNotifyWhatsApp) {
        n8nPayloads.push({
          parent_email: email,
          parent_phone: phone,
          school_name: schoolName,
          student_name: `${c.first_name} ${c.last_name}`,
          student_id: c.identifier,
          grade: c.grade,
          source: 'bulk_upload_safelunch'
        });
      }

      return {
        school_id: schoolId,
        first_name: c.first_name || 'Desconocido',
        last_name: c.last_name || 'Desconocido',
        identifier: c.identifier || null,
        type: c.type === 'staff' ? 'staff' : 'student',
        grade: c.grade || null,
        parent_email: email,
        parent_id: parentId,
        is_active: true,
        metadata
      };
    });

    // 4. Perform bulk insert
    const { data: inserted, error } = await adminClient
      .from('consumers')
      .insert(dataToInsert)
      .select('id');

    if (error) throw error;

    // 5. Trigger n8n Webhook if candidates exist
    if (n8nPayloads.length > 0 && process.env.N8N_WHATSAPP_WEBHOOK_URL) {
      try {
        await fetch(process.env.N8N_WHATSAPP_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'bulk_import_notification',
            source: 'bulk_upload_safelunch',
            data: n8nPayloads
          })
        });
      } catch (webhookErr) {
        console.error('[importConsumersAction] n8n Webhook Error:', webhookErr);
      }
    }

    revalidatePath('/school/consumers');
    
    return { 
      success: true, 
      summary: stats,
      count: inserted?.length || 0 
    };
  } catch (error: any) {
    console.error('[importConsumersAction] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function getSchoolDailyKPIs() {
  const supabaseAdmin = await createAdminClient();
  const schoolId = await getEffectiveSchoolId();
  if (!schoolId) return { error: 'Escuela no asignada' };

  const todayIso = new Date().toISOString().split('T')[0];
  const todayStart = `${todayIso}T00:00:00.000Z`;
  const tomorrowStart = `${new Date(new Date().getTime() + 86400000).toISOString().split('T')[0]}T00:00:00.000Z`;

  const { data: consumers } = await supabaseAdmin
    .from('consumers')
    .select('id')
    .eq('school_id', schoolId);

  const consumerIds = consumers?.map(c => c.id) || [];
  let saldoTotal = 0;
  let ventaTotalHoy = 0;
  let alumnosAtendidos = 0;

  if (consumerIds.length > 0) {
    const { data: wallets } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, consumer_id')
      .in('consumer_id', consumerIds);
    
    const walletData = wallets || [];
    saldoTotal = walletData.reduce((acc, w) => acc + (Number(w.balance) || 0), 0);
    const walletIds = walletData.map(w => w.id);

    if (walletIds.length > 0) {
       const { data: txs } = await supabaseAdmin
         .from('transactions')
         .select('amount, wallet_id')
         .in('wallet_id', walletIds)
         .in('type', ['purchase', 'debit'])
         .gte('created_at', todayStart)
         .lt('created_at', tomorrowStart);

       const transactionsData = txs || [];
       ventaTotalHoy = transactionsData.reduce((acc, tx) => acc + Math.abs(Number(tx.amount) || 0), 0);

       const txWalletIds = [...new Set(transactionsData.map(tx => tx.wallet_id))];
       const transactingConsumerIds = new Set();
       txWalletIds.forEach(wid => {
          const w = walletData.find(w => w.id === wid);
          if (w) transactingConsumerIds.add(w.consumer_id);
       });
       alumnosAtendidos = transactingConsumerIds.size;
    }
  }

  const ticketPromedio = alumnosAtendidos > 0 ? (ventaTotalHoy / alumnosAtendidos) : 0;

  return {
    ventaTotalHoy,
    alumnosAtendidos,
    ticketPromedio,
    saldoTotal
  };
}

export async function getSalesByGradeToday() {
  const supabaseAdmin = await createAdminClient();
  const schoolId = await getEffectiveSchoolId();
  if (!schoolId) return { error: 'Escuela no asignada' };

  const todayIso = new Date().toISOString().split('T')[0];
  const todayStart = `${todayIso}T00:00:00.000Z`;
  const tomorrowStart = `${new Date(new Date().getTime() + 86400000).toISOString().split('T')[0]}T00:00:00.000Z`;

  const { data: consumers } = await supabaseAdmin
    .from('consumers')
    .select('id, grade')
    .eq('school_id', schoolId);

  const consumerIds = consumers?.map(c => c.id) || [];
  
  if (consumerIds.length === 0) return { data: [] };

  const { data: wallets } = await supabaseAdmin
    .from('wallets')
    .select('id, consumer_id')
    .in('consumer_id', consumerIds);

  const walletData = wallets || [];
  const walletIds = walletData.map(w => w.id);

  if (walletIds.length === 0) return { data: [] };

  const { data: txs } = await supabaseAdmin
    .from('transactions')
    .select('amount, wallet_id')
    .in('wallet_id', walletIds)
    .in('type', ['purchase', 'debit'])
    .gte('created_at', todayStart)
    .lt('created_at', tomorrowStart);

  const transactionsData = txs || [];

  const gradeSales: Record<string, number> = {};

  transactionsData.forEach(tx => {
     const w = walletData.find(w => w.id === tx.wallet_id);
     if (w) {
        const c = consumers?.find(c => c.id === w.consumer_id);
        // Only grouping by known grades and ignoring blanks, or putting them in 'Sin Grado'
        const grade = (c && c.grade) ? c.grade : 'Sin Grado';
        if (!gradeSales[grade]) gradeSales[grade] = 0;
        gradeSales[grade] += Math.abs(Number(tx.amount) || 0);
     }
  });

  const chartData = Object.entries(gradeSales).map(([grade, sales]) => ({
     grade,
     sales
  })).sort((a, b) => b.sales - a.sales);

  return { data: chartData };
}
