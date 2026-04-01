import { createAdminClient } from '@/utils/supabase/server';
import MasterDashboardClient from '@/components/master/MasterDashboardClient';

export default async function MasterDashboardPage() {
  const supabaseAdmin = await createAdminClient();

  // 1. Fetch Schools with user counts
  const { data: schoolsData } = await supabaseAdmin
    .from('schools')
    .select('*, users:consumers(count)')
    .order('created_at', { ascending: false });

  // 2. Fetch all successful credit transactions with school context
  // Join: transactions -> wallets -> consumers -> school_id
  const { data: txData } = await supabaseAdmin
    .from('transactions')
    .select(`
      amount,
      created_at,
      wallets!inner (
        consumers!inner (
          school_id
        )
      )
    `)
    .eq('type', 'credit')
    .not('stripe_payment_intent_id', 'is', null);

  const transactions = txData || [];

  // 3. Aggregate Data
  const statsBySchool: Record<string, { volume: number; commission: number; count: number }> = {};
  
  // Chart Data: Last 15 days global volume
  const dailyHistory: Record<string, { volume: number; revenue: number }> = {};

  transactions.forEach(tx => {
    const schoolId = (tx.wallets as any)?.consumers?.school_id;
    const amount = Math.abs(Number(tx.amount || 0));
    const dateKey = new Date(tx.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });

    if (schoolId) {
      if (!statsBySchool[schoolId]) {
        statsBySchool[schoolId] = { volume: 0, commission: 0, count: 0 };
      }
      
      const school = (schoolsData || []).find(s => s.id === schoolId);
      const commPct = school?.commission_percentage || 5.00;
      const commAmount = amount * (Number(commPct) / 100);

      statsBySchool[schoolId].volume += amount;
      statsBySchool[schoolId].commission += commAmount;
      statsBySchool[schoolId].count += 1;

      // History for chart
      if (!dailyHistory[dateKey]) {
        dailyHistory[dateKey] = { volume: 0, revenue: 0 };
      }
      dailyHistory[dateKey].volume += amount;
      dailyHistory[dateKey].revenue += commAmount;
    }
  });

  // 4. Transform Schools Data
  const schools = (schoolsData || []).map(s => {
    const stats = statsBySchool[s.id] || { volume: 0, commission: 0, count: 0 };
    return {
      ...s,
      users: (s.users as any)?.[0]?.count || 0,
      total_volume: stats.volume,
      net_revenue: stats.commission,
      transaction_count: stats.count
    };
  });

  // 5. Global KPIs
  const globalVolume = schools.reduce((acc, s) => acc + s.total_volume, 0);
  const globalRevenue = schools.reduce((acc, s) => acc + s.net_revenue, 0);
  const avgMargin = globalVolume > 0 ? (globalRevenue / globalVolume) * 100 : 0;

  // 6. Chart Data Transformation (Last 15 days)
  const chartData = Array.from({ length: 15 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (14 - i));
    const key = d.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
    return {
      date: key,
      volumen: dailyHistory[key]?.volume || 0,
      ingresos: dailyHistory[key]?.revenue || 0,
    };
  });

  // 7. Summary counts
  const { count: usersCount } = await supabaseAdmin
    .from('consumers')
    .select('*', { count: 'exact', head: true });

  const totalTxCount = transactions.length;

  return (
    <MasterDashboardClient
      schools={schools}
      usersCount={usersCount || 0}
      txCount={totalTxCount}
      globalVolume={globalVolume}
      globalRevenue={globalRevenue}
      avgMargin={avgMargin}
      chartData={chartData}
    />
  );
}
