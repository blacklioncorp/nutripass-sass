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
    const { amount, walletId, schoolId, allocations, isBulk } = await req.json();
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Calculate amounts and fees
    let totalReloadAmountCents = 0;
    let feePercentage = isBulk ? 0.12 : 0.10;

    if (isBulk && allocations) {
      totalReloadAmountCents = allocations.reduce((acc: number, curr: any) => acc + Math.round(parseFloat(curr.amount) * 100), 0);
    } else {
      totalReloadAmountCents = Math.round(parseFloat(amount) * 100);
    }

    const platformFeeCents = Math.round(totalReloadAmountCents * feePercentage);
    const totalChargeCents = totalReloadAmountCents + platformFeeCents;

    // 1. Fetch destination school and settings
    const { data: school } = await supabase
      .from('schools')
      .select('stripe_account_id, stripe_onboarding_complete, settings')
      .eq('id', schoolId)
      .single();
    
    // 1.1 Validate Minimum Recharge Amount and Tenant Isolation
    const minRechargeAmount = (school?.settings as any)?.financial?.min_recharge_amount ?? 50;
    
    if (isBulk && allocations) {
      const invalid = allocations.find((a: any) => a.amount < minRechargeAmount);
      if (invalid) {
         return NextResponse.json(
           { error: `El monto mínimo de recarga por alumno es $${minRechargeAmount.toFixed(2)}. Revisa tus montos.` }, 
           { status: 400 }
         );
      }
      
      // Tenant Isolation for Bulk Wallets
      const walletIds = allocations.map((a: any) => a.walletId);
      const { data: validWallets } = await supabase
        .from('wallets')
        .select('id, consumers!inner(school_id)')
        .in('id', walletIds);
      
      const allValid = validWallets && validWallets.every((w: any) => w.consumers?.school_id === schoolId);
      if (!allValid || validWallets.length !== walletIds.length) {
         return NextResponse.json({ error: 'Algunas carteras no pertenecen a la escuela actual o son inválidas.' }, { status: 403 });
      }
    } else {
      const rechargeAmount = totalReloadAmountCents / 100;
      if (rechargeAmount < minRechargeAmount) {
        return NextResponse.json(
          { error: `El monto mínimo de recarga es $${minRechargeAmount.toFixed(2)}` }, 
          { status: 400 }
        );
      }
      
      // Tenant Isolation for Single Wallet
      if (walletId) {
        const { data: validWallet } = await supabase
          .from('wallets')
          .select('id, consumers!inner(school_id)')
          .eq('id', walletId)
          .single();
        
        if (!validWallet || (validWallet as any).consumers?.school_id !== schoolId) {
           return NextResponse.json({ error: 'La cartera proporcionada no pertenece a la escuela actual o es inválida.' }, { status: 403 });
        }
      }
    }
    
    // 2. Prepare Metadata
    // Note: allocations might be too big for metadata if there are many kids. 
    // We'll trust the 500 char limit for now or use a dedicated table.
    // User requested: "Si es muy grande, guarda un pending_recharge_id en una tabla temporal en Supabase"
    
    let bulkRechargeId = null;
    if (isBulk && allocations) {
      const { data: bulkData, error: bulkError } = await supabase
        .from('bulk_recharges')
        .insert({
          user_id: user.id,
          allocations,
          total_amount: totalReloadAmountCents / 100,
          fee_amount: platformFeeCents / 100,
          status: 'pending'
        })
        .select('id')
        .single();
      
      if (bulkError) throw bulkError;
      bulkRechargeId = bulkData.id;
    }

    // 3. Create PaymentIntent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: totalChargeCents,
      currency: 'mxn',
      payment_method_types: ['card'],
      metadata: {
        is_bulk: isBulk ? 'true' : 'false',
        bulk_recharge_id: bulkRechargeId || '',
        wallet_id: walletId || '',
        school_id: schoolId || '',
        recharge_amount: (totalReloadAmountCents / 100).toFixed(2),
      }
    };

    // Only apply Connect routing if the school is fully onboarded
    if (school?.stripe_account_id && school.stripe_onboarding_complete) {
      paymentIntentParams.application_fee_amount = platformFeeCents;
      paymentIntentParams.transfer_data = {
        destination: school.stripe_account_id,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // Update bulk recharge with intent ID if applicable
    if (bulkRechargeId) {
      await supabase
        .from('bulk_recharges')
        .update({ stripe_payment_intent_id: paymentIntent.id })
        .eq('id', bulkRechargeId);
    }

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      breakdown: {
        recharge: (totalReloadAmountCents / 100).toFixed(2),
        fee: (platformFeeCents / 100).toFixed(2),
        total: (totalChargeCents / 100).toFixed(2)
      }
    });
  } catch (error: any) {
    console.error('PaymentIntent Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
