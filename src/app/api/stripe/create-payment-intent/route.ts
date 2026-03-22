import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
  apiVersion: '2026-02-25.clover',
});

// Platform charge percentage (e.g. 10%)
const PLATFORM_FEE_PERCENTAGE = 0.10;

export async function POST(req: Request) {
  try {
    const { amount, walletId, schoolId } = await req.json();
    
    if (!amount || !walletId || !schoolId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // 1. Fetch destination school to ensure they have an onboarded Stripe Account
    const { data: school } = await supabase.from('schools').select('stripe_account_id, stripe_onboarding_complete').eq('id', schoolId).single();
    
    if (!school?.stripe_account_id || !school.stripe_onboarding_complete) {
      return NextResponse.json({ error: 'El colegio aún no ha configurado recibir pagos en línea.' }, { status: 400 });
    }

    // 2. Calculate fees
    // Amount usually arrives in decimals ($200.00). Stripe needs cents.
    const reloadAmountCents = Math.round(parseFloat(amount) * 100);
    const platformFeeCents = Math.round(reloadAmountCents * PLATFORM_FEE_PERCENTAGE);
    const totalChargeCents = reloadAmountCents + platformFeeCents;

    // 3. Create PaymentIntent with Destination Charge
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalChargeCents,
      currency: 'mxn',
      payment_method_types: ['card'],
      application_fee_amount: platformFeeCents,
      transfer_data: {
        destination: school.stripe_account_id,
      },
      metadata: {
        wallet_id: walletId,
        recharge_amount: (reloadAmountCents / 100).toFixed(2), // Original clean recharge amount
      }
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      breakdown: {
        recharge: (reloadAmountCents / 100).toFixed(2),
        fee: (platformFeeCents / 100).toFixed(2),
        total: (totalChargeCents / 100).toFixed(2)
      }
    });
  } catch (error: any) {
    console.error('PaymentIntent Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
