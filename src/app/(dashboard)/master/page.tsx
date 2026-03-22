import { createClient } from '@/utils/supabase/server';
import MasterDashboardClient from '@/components/master/MasterDashboardClient';

export default async function MasterDashboardPage() {
  const supabase = await createClient();

  const { data: schools } = await supabase
    .from('schools')
    .select('*')
    .order('created_at', { ascending: false });

  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: txCount } = await supabase
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
