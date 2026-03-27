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

        // Update each wallet
        for (const alloc of allocations) {
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
            
            // Log individual transaction
            await supabaseAdmin.from('transactions').insert({
              wallet_id: alloc.walletId,
              amount: alloc.amount,
              type: 'credit',
              description: 'Recarga Múltiple (Stripe)',
              stripe_payment_intent_id: intentId,
            });
          }
        }

        // Mark bulk recharge as completed
        await supabaseAdmin
          .from('bulk_recharges')
          .update({ status: 'completed' })
          .eq('id', bulkRechargeId);

      } else if (singleWalletId && !isNaN(singleRechargeAmount)) {
        const rechargeAmount = parseFloat(singleRechargeAmount.toString());
        await supabaseAdmin.from('transactions').insert({
          wallet_id: singleWalletId,
          amount: rechargeAmount,
          type: 'credit',
          description: 'Recarga Billetera vía Tarjeta (Stripe)',
          stripe_payment_intent_id: intentId,
        });

        const { data: wallet, error: walletError } = await supabaseAdmin
          .from('wallets')
          .select('balance')
          .eq('id', singleWalletId)
          .single();

        if (walletError || !wallet) throw new Error('Wallet not found');
        const newBalance = (parseFloat(wallet.balance.toString()) || 0) + rechargeAmount;
        
        await supabaseAdmin
          .from('wallets')
          .update({ balance: newBalance })
          .eq('id', singleWalletId);
      }
    } catch (err: any) {
      console.error('Error processing successful payment:', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
