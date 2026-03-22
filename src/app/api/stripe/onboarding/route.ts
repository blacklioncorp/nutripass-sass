import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/utils/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'dummy_key', {
  apiVersion: '2026-02-25.clover',
});

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();
    if (!profile?.school_id) return NextResponse.json({ error: 'No school mapping' }, { status: 400 });

    const { data: school } = await supabase.from('schools').select('id, stripe_account_id').eq('id', profile.school_id).single();
    if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

    let accountId = school.stripe_account_id;

    // Create a Stripe Account if the school doesn't have one
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'standard',
      });
      accountId = account.id;

      await supabase.from('schools').update({ stripe_account_id: accountId }).eq('id', school.id);
    }

    // Create Account Link for onboarding
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/school/settings`,
      return_url: `${origin}/school/settings?stripe_onboarding=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error: any) {
    console.error('Stripe Onboarding Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
