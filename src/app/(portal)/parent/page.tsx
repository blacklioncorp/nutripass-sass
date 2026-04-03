import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import ParentDashboardClient from '@/components/portal/ParentDashboardClient';

// ─── TypeScript Types ────────────────────────────────────────────────────────
export type Wallet = {
  id: string;
  type: 'comedor' | 'snack';
  balance: number;
  max_overdraft?: number;
};

export type Transaction = {
  id: string;
  consumer_id: string;
  amount: number;
  transaction_type: 'purchase' | 'reload' | 'adjustment';
  description: string;
  wallet_type?: string;
  created_at: string;
  stripe_payment_intent_id?: string;
};

export type Consumer = {
  id: string;
  first_name: string;
  last_name: string;
  identifier?: string;
  grade?: string;
  allergies?: string[];
  earned_nutri_points: number;
  nfc_tag_uid?: string;
  wallets: Wallet[];
};

export type UserProfile = {
  id: string;
  full_name?: string;
  email?: string;
  role?: string;
  school_id?: string;
};

// No mock data — the app starts clean for every new school/parent.

// ─── Server Component ────────────────────────────────────────────────────────
export default async function ParentPortal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Parallel fetching for performance
  let [profileResult, consumersResult] = await Promise.all([
    supabase.from('parents').select('id, full_name, email').eq('id', user.id).single(),
    supabase
      .from('consumers')
      .select(`
        id, first_name, last_name, identifier, type,
        allergies, earned_nutri_points, nfc_tag_uid,
        wallets ( id, type, balance, max_overdraft )
      `)
      .eq('parent_id', user.id)
      .order('first_name'),
  ]);

  let profile = profileResult.data as UserProfile | null;
  let consumers = consumersResult.data as Consumer[] | null;

  // Fetch school_id from profiles (since parents table might not have it yet, or it's separate)
  // The system seems to use 'profiles' for roles/school_id and 'parents' for parent-specific data.
  // We'll keep school_id logic but transition the main 'onboarding' trigger to 'parents' table.
  if (!profile || !profile.full_name) {
    const { data: profileRel } = await supabase.from('profiles').select('school_id, role').eq('id', user.id).single();
    if (profileRel) {
      profile = { ...profile, ...profileRel } as UserProfile;
    }
  }

  // AUTO-LINKING LOGIC: If no children linked by ID, search by email
  if (user.email && (!consumers || consumers.length === 0)) {
    const { createAdminClient } = await import('@/utils/supabase/server');
    const adminClient = await createAdminClient();

    const { data: linkedConsumers } = await adminClient
      .from('consumers')
      .select(`
        id, first_name, last_name, identifier, type, school_id,
        allergies, earned_nutri_points, nfc_tag_uid,
        wallets ( id, type, balance, max_overdraft )
      `)
      .eq('parent_email', user.email.toLowerCase())
      .is('parent_id', null);

    if (linkedConsumers && linkedConsumers.length > 0) {
      console.log(`Auto-linking ${linkedConsumers.length} consumers to parent ${user.email}`);
      
      const schoolId = (linkedConsumers[0] as any).school_id;

      // Ensure parents record exists and has school_id in profiles
      await Promise.all([
        supabase.from('parents').upsert({
          id: user.id,
          email: user.email.toLowerCase(),
          full_name: profile?.full_name || null
        }, { onConflict: 'id' }),
        supabase.from('profiles').upsert({
          id: user.id,
          role: 'parent',
          school_id: schoolId
        }, { onConflict: 'id' })
      ]);

      const { data: refreshedProfile } = await supabase.from('parents').select('id, full_name, email').eq('id', user.id).single();
      profile = { ...refreshedProfile, school_id: schoolId, role: 'parent' } as UserProfile;
      
      // Update consumers with parent_id using ADMIN client to bypass RLS
      
      const consumerIds = linkedConsumers.map(c => c.id);
      await adminClient
        .from('consumers')
        .update({ parent_id: user.id })
        .in('id', consumerIds);

      consumers = linkedConsumers as unknown as Consumer[];
    }
  }

  const userEmail = user!.email ?? '';
  const needsOnboarding = !profile?.full_name;

  // Fetch last 20 transactions for ALL children found (fetching more to allow for grouping room)
  let transactions: Transaction[] = [];
  if (consumers && consumers.length > 0) {
    const walletIds = consumers.flatMap(c => c.wallets.map(w => w.id));
    if (walletIds.length > 0) {
      const { data: txData } = await supabase
        .from('transactions')
        .select(`
          id, 
          wallet_id, 
          amount, 
          type, 
          description, 
          created_at,
          stripe_payment_intent_id,
          wallets ( consumer_id, type )
        `)
        .in('wallet_id', walletIds)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (txData) {
        // ─── Grouping Logic ───
        // We group by stripe_payment_intent_id + consumer_id to unify 
        // multi-wallet recharges (Comedor/Snacks) for the same student.
        const txMap = new Map();
        
        txData.forEach((tx: any) => {
          const cid = tx.wallets?.consumer_id;
          // Only group credits with a stripe intent ID
          const isStripeCredit = tx.type === 'credit' && tx.stripe_payment_intent_id;
          const key = isStripeCredit ? `grouped-${tx.stripe_payment_intent_id}-${cid}` : tx.id;
          
          if (!txMap.has(key)) {
            txMap.set(key, {
              id: tx.id,
              consumer_id: cid,
              amount: 0,
              transaction_type: tx.type,
              description: tx.description || 'Transacción',
              wallet_type: tx.wallets?.type,
              created_at: tx.created_at,
              stripe_payment_intent_id: tx.stripe_payment_intent_id
            });
          }
          
          const entry = txMap.get(key);
          const val = tx.type === 'debit' ? -Math.abs(tx.amount) : Math.abs(tx.amount);
          entry.amount += val;

          // If grouping multiple wallets, update label
          if (isStripeCredit && entry.wallet_type !== tx.wallets?.type) {
             entry.wallet_type = 'Múltiple';
             entry.description = 'Recarga Múltiple (Stripe)';
          }
        });

        transactions = Array.from(txMap.values());
      }
    }
  }

  const resolvedConsumers = consumers ?? [];
  const resolvedTransactions = transactions;

  return (
    <ParentDashboardClient
      consumers={resolvedConsumers}
      transactions={resolvedTransactions}
      userProfile={profile}
      needsOnboarding={needsOnboarding}
      userEmail={userEmail}
    />
  );
}
