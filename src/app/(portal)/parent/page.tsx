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

// ─── Mock Data (used when real DB data is empty) ────────────────────────────
const MOCK_CONSUMERS: Consumer[] = [
  {
    id: 'mock-1',
    first_name: 'Juan',
    last_name: 'Pérez',
    identifier: '2024-001',
    grade: '4° A',
    allergies: ['Maní', 'Lactosa'],
    earned_nutri_points: 450,
    nfc_tag_uid: '123-456',
    wallets: [
      { id: 'w1', type: 'comedor', balance: 450.0 },
      { id: 'w2', type: 'snack', balance: 50.0 },
    ],
  },
  {
    id: 'mock-2',
    first_name: 'María',
    last_name: 'García',
    identifier: '2024-002',
    grade: '2° B',
    allergies: [],
    earned_nutri_points: 110,
    nfc_tag_uid: undefined,
    wallets: [
      { id: 'w3', type: 'comedor', balance: 1200.0 },
      { id: 'w4', type: 'snack', balance: 15.0 },
    ],
  },
];

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', consumer_id: 'mock-1', amount: -35, transaction_type: 'purchase', description: 'Sándwich de Jamón', wallet_type: 'snack', created_at: new Date().toISOString() },
  { id: 't2', consumer_id: 'mock-1', amount: 500, transaction_type: 'reload', description: 'Recarga Tarjeta Crédito', wallet_type: 'comedor', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 't3', consumer_id: 'mock-1', amount: -85, transaction_type: 'purchase', description: 'Almuerzo Ejecutivo', wallet_type: 'comedor', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 't4', consumer_id: 'mock-2', amount: 200, transaction_type: 'reload', description: 'Recarga App', wallet_type: 'comedor', created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 't5', consumer_id: 'mock-2', amount: -45, transaction_type: 'purchase', description: 'Menú del Día', wallet_type: 'comedor', created_at: new Date(Date.now() - 172800000).toISOString() },
];

// ─── Server Component ────────────────────────────────────────────────────────
export default async function ParentPortal() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Parallel fetching for performance
  const [profileResult, consumersResult] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, role, school_id').eq('id', user.id).single(),
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

  const profile = profileResult.data as UserProfile | null;
  const consumers = consumersResult.data as Consumer[] | null;

  // Fetch last 10 transactions for ALL children found
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
          wallets ( consumer_id, type )
        `)
        .in('wallet_id', walletIds)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (txData) {
        transactions = txData.map((tx: any) => ({
          id: tx.id,
          consumer_id: tx.wallets?.consumer_id,
          amount: tx.type === 'debit' ? -Math.abs(tx.amount) : Math.abs(tx.amount),
          transaction_type: tx.type,
          description: tx.description || 'Transacción',
          wallet_type: tx.wallets?.type,
          created_at: tx.created_at
        }));
      }
    }
  }

  // Fall back to mock data when DB is empty (dev mode)
  const resolvedConsumers = consumers && consumers.length > 0 ? consumers : MOCK_CONSUMERS;
  const resolvedTransactions = transactions.length > 0 ? transactions : MOCK_TRANSACTIONS;

  return (
    <ParentDashboardClient
      consumers={resolvedConsumers}
      transactions={resolvedTransactions}
      userProfile={profile}
    />
  );
}
