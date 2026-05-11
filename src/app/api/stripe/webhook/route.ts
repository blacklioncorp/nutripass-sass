import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
  apiVersion: '2026-02-25.clover',
});

// Use Service Role to bypass RLS in the webhook execution
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key'
);

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const isBulk = paymentIntent.metadata.is_bulk === 'true';
    const bulkRechargeId = paymentIntent.metadata.bulk_recharge_id;
    const singleWalletId = paymentIntent.metadata.wallet_id;
    const singleSchoolId = paymentIntent.metadata.school_id;
    const singleRechargeAmount = parseFloat(paymentIntent.metadata.recharge_amount);
    const intentId = paymentIntent.id;

    try {
      if (isBulk && bulkRechargeId) {
        // --- BULK RECHARGE LOGIC ---
        const { data: bulkDoc, error: bulkError } = await supabaseAdmin
          .from('bulk_recharges')
          .select('*')
          .eq('id', bulkRechargeId)
          .single();

        if (bulkError || !bulkDoc) throw new Error('Bulk recharge document not found');
        if (bulkDoc.status === 'completed') return NextResponse.json({ received: true });

        const allocations = bulkDoc.allocations as any[];

        // FIX 1 (BULK): INSERT before UPDATE — idempotency gate
        for (let i = 0; i < allocations.length; i++) {
          const alloc = allocations[i];
          const compoundId = `${intentId}-bulk-${i}`;

          // Step 1: Attempt INSERT first (idempotency gate)
          const { error: insertErr } = await supabaseAdmin.from('transactions').insert({
            wallet_id: alloc.walletId,
            amount: parseFloat(alloc.amount),
            type: 'credit',
            description: 'Recarga Múltiple (Stripe)',
            stripe_payment_intent_id: compoundId,
          });

          if (insertErr) {
            if (insertErr.code === '23505') {
              // Duplicate detected — wallet was already funded, skip silently
              console.warn(`Webhook duplicado ignorado (bulk): ${compoundId}`);
              continue;
            }
            throw insertErr;
          }

          // Step 2: INSERT succeeded → safe to update wallet balance
          const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('id', alloc.walletId)
            .single();

          if (wallet) {
            const newBalance = wallet.balance + parseFloat(alloc.amount);
            await supabaseAdmin
              .from('wallets')
              .update({ balance: newBalance })
              .eq('id', alloc.walletId);
          }
        }

        // Mark bulk recharge as completed
        await supabaseAdmin
          .from('bulk_recharges')
          .update({ status: 'completed' })
          .eq('id', bulkRechargeId);

      } else if (singleWalletId && !isNaN(singleRechargeAmount)) {
        const rechargeAmount = parseFloat(singleRechargeAmount.toString());

        // FIX 2 (SINGLE): Tenant Isolation — validate wallet belongs to correct school
        if (singleSchoolId) {
          const { data: validWallet, error: validationError } = await supabaseAdmin
            .from('wallets')
            .select('id, consumers!inner(school_id)')
            .eq('id', singleWalletId)
            .eq('consumers.school_id', singleSchoolId)
            .single();

          if (validationError || !validWallet) {
            console.error(`SECURITY: Tenant isolation breach attempt — wallet ${singleWalletId} does not belong to school ${singleSchoolId}. Intent: ${intentId}`);
            // Return 200 so Stripe stops retrying — but do NOT touch any wallet
            return NextResponse.json({ received: true });
          }
        }

        // FIX 1 (SINGLE): INSERT before UPDATE — idempotency gate
        const { error: insertError } = await supabaseAdmin.from('transactions').insert({
          wallet_id: singleWalletId,
          amount: rechargeAmount,
          type: 'credit',
          description: 'Recarga Billetera vía Tarjeta (Stripe)',
          stripe_payment_intent_id: intentId,
        });

        if (insertError) {
          if (insertError.code === '23505') {
            // Duplicate webhook — wallet already funded, acknowledge and stop
            console.warn(`Webhook duplicado ignorado (single): ${intentId}`);
            return NextResponse.json({ received: true });
          }
          throw insertError;
        }

        // INSERT succeeded → safe to update wallet balance
        const { data: wallet, error: walletError } = await supabaseAdmin
          .from('wallets')
          .select('balance, type, consumers(first_name, last_name, parent_email, parent_id)')
          .eq('id', singleWalletId)
          .single();

        if (walletError || !wallet) throw new Error('Wallet not found after idempotency check');
        const newBalance = (parseFloat(wallet.balance.toString()) || 0) + rechargeAmount;

        await supabaseAdmin
          .from('wallets')
          .update({ balance: newBalance })
          .eq('id', singleWalletId);

        // Disparar Webhook a n8n
        try {
          const consumerData: any = Array.isArray(wallet.consumers) ? wallet.consumers[0] : wallet.consumers;
          let parentName = "Padre/Tutor";

          if (consumerData?.parent_id) {
            const { data: parentObj } = await supabaseAdmin
              .from('parents')
              .select('full_name')
              .eq('id', consumerData.parent_id)
              .single();
            if (parentObj?.full_name) {
              parentName = parentObj.full_name;
            }
          }

          const studentName = consumerData ? `${consumerData.first_name} ${consumerData.last_name}`.trim() : 'Alumno';
          const parentEmail = consumerData?.parent_email || '';

          const payload = {
            transaction_type: "recharge",
            amount: rechargeAmount,
            wallet_type: wallet.type || 'comedor',
            parent_email: parentEmail,
            parent_name: parentName,
            student_name: studentName,
            date: new Date().toISOString()
          };

          const n8nWebhookUrl = process.env.N8N_WHATSAPP_WEBHOOK_URL || 'https://asistente.tlapafood.com/webhook/recharge-success';

          await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } catch (webhookErr) {
          console.error('Error enviando webhook de recarga a n8n:', webhookErr);
        }
      }
    } catch (err: any) {
      console.error('Error processing successful payment:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
