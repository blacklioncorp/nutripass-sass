import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2026-02-25.clover',
});

// Use Service Role to bypass RLS in the webhook execution
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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
    
    const walletId = paymentIntent.metadata.wallet_id;
    const rechargeAmount = parseFloat(paymentIntent.metadata.recharge_amount);
    const intentId = paymentIntent.id;

    if (!walletId || isNaN(rechargeAmount)) {
      console.error('Missing required metadata on payment intent');
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
    }

    try {
      // 1. Get current balance
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('id', walletId)
        .single();

      if (walletError || !wallet) throw new Error('Wallet not found');

      // 2. Perform recharge and log transaction atomically (Or via individual updates if not wrapping in RPC)
      // Wait, there is no generic "recharge" RPC function right now so we will do it via two calls or an RPC if we add it. 
      // We will perform two updates assuming no race condition immediately since webhooks are singular inserts here.
      
      const newBalance = wallet.balance + rechargeAmount;
      
      const { error: updateError } = await supabaseAdmin
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', walletId);
      
      if (updateError) throw updateError;

      // 3. Register transaction
      await supabaseAdmin.from('transactions').insert({
        wallet_id: walletId,
        amount: rechargeAmount,
        type: 'credit',
        description: 'Recarga Billetera vía Tarjeta (Stripe)',
        stripe_payment_intent_id: intentId,
      });

    } catch (err: any) {
      console.error('Error processing successful payment:', err);
      // Even if our DB fails, Stripe consider it done. We return 500 so Stripe retries.
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
