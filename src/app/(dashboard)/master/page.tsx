import { createClient, createAdminClient } from '@/utils/supabase/server';
import MasterDashboardClient from '@/components/master/MasterDashboardClient';

export default async function MasterDashboardPage() {
  const supabaseAdmin = await createAdminClient();

  const { data: schoolsData } = await supabaseAdmin
    .from('schools')
    .select('*, users:consumers(count)')
    .order('created_at', { ascending: false });

  const schools = (schoolsData || []).map(s => ({
    ...s,
    users: (s.users as any)?.[0]?.count || 0
  }));

  const { count: usersCount } = await supabaseAdmin
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: txCount } = await supabaseAdmin
    .from('transactions')
    .select('*', { count: 'exact', head: true });

  return (
    <MasterDashboardClient
      schools={schools || []}
      usersCount={usersCount || 0}
      txCount={txCount || 0}
    />
  );
}
