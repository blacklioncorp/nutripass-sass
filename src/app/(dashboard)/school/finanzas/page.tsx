import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function SchoolFinancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get school_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single();

  const schoolId = profile?.school_id;

  if (!schoolId) {
    return <div>No se encontró información de la escuela.</div>;
  }

  // Fetch all transactions for this school
  // In a real app, this should be limited or paginated.
  // Filtering through joins: transactions -> wallets -> consumers(school_id)
  const { data: txs, error } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      type,
      description,
      created_at,
      stripe_payment_intent_id,
      wallets!inner (
        id,
        consumers!inner (
          id,
          school_id
        )
      )
    `)
    .eq('wallets.consumers.school_id', schoolId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
  }

  // Calculate KPIs
  // NutriPass Fee: 5% (simulated)
  const FEE_PERCENTAGE = 0.05;

  const grossSales = txs
    ?.filter(t => t.type === 'credit' && t.stripe_payment_intent_id)
    ?.reduce((sum, t) => sum + Math.abs(t.amount || 0), 0) || 0;

  const commissions = grossSales * FEE_PERCENTAGE;
  const netIncome = grossSales - commissions;

  // Simulate Payouts (grouped by week)
  const payouts = [
    { date: 'Semana 12 (Mar 17 - Mar 23)', amount: netIncome * 0.4, status: 'Pagado' },
    { date: 'Semana 11 (Mar 10 - Mar 16)', amount: netIncome * 0.35, status: 'Pagado' },
    { date: 'Semana 10 (Mar 03 - Mar 09)', amount: netIncome * 0.25, status: 'En espera' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-[#8aa8cc] font-bold text-xs uppercase tracking-widest mb-1">FINANZAS</p>
        <h1 className="text-4xl font-black text-[#1a3a5c] tracking-tight">Transparencia Financiera</h1>
        <p className="text-[#8aa8cc] font-medium mt-1">Desglose de ingresos y dispersiones bancarias.</p>
      </div>

      {/* KPI Cloud */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-8 border border-[#e8f0f7] shadow-sm">
          <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-[0.2em] mb-4">Ventas Brutas</p>
          <p className="text-4xl font-black text-[#1a3a5c] tracking-tight">
            ${grossSales.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-2 mt-4 text-emerald-500 font-bold text-xs">
            <span>↑</span> 12% vs mes anterior
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-[#e8f0f7] shadow-sm">
          <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-[0.2em] mb-4">Comisiones (SafeLunch/Fee)</p>
          <p className="text-4xl font-black text-amber-500 tracking-tight">
            -${commissions.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[#8aa8cc] text-xs font-semibold mt-4">Tarifa plana de procesamiento: {FEE_PERCENTAGE * 100}%</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-[#004B87] shadow-lg bg-gradient-to-br from-[#004B87] to-[#003870]">
          <p className="text-white/60 font-black text-[10px] uppercase tracking-[0.2em] mb-4">Neto a Transferir</p>
          <p className="text-4xl font-black text-white tracking-tight">
            ${netIncome.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
          <div className="mt-4 inline-flex px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-wider">
            Listo para dispersión
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-3xl border border-[#e8f0f7] shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-[#e8f0f7] flex justify-between items-center bg-[#fcfdfe]">
          <h2 className="text-xl font-black text-[#1a3a5c]">Dispersiones Semanales</h2>
          <button className="text-[#004B87] font-bold text-sm">Descargar Reporte Completo</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f8fafd]">
                <th className="px-8 py-4 text-[10px] font-black text-[#8aa8cc] uppercase tracking-widest">Periodo</th>
                <th className="px-8 py-4 text-[10px] font-black text-[#8aa8cc] uppercase tracking-widest">Monto Liquidable</th>
                <th className="px-8 py-4 text-[10px] font-black text-[#8aa8cc] uppercase tracking-widest">Estado</th>
                <th className="px-8 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8f0f7]">
              {payouts.map((p, idx) => (
                <tr key={idx} className="hover:bg-[#fcfdfe] transition">
                  <td className="px-8 py-5 text-sm font-bold text-[#1a3a5c]">{p.date}</td>
                  <td className="px-8 py-5 text-sm font-black text-[#1a3a5c]">
                    ${p.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                      p.status === 'Pagado' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-amber-100 text-amber-700 font-black'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button className="text-[#2b5fa6] text-sm font-bold hover:underline">Ver detalle</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      <div className="bg-[#f0f5fb] border border-[#e8f0f7] rounded-2xl p-6 flex gap-4">
        <span className="text-xl">💡</span>
        <p className="text-xs text-[#2b5fa6] font-medium leading-relaxed">
          Las dispersiones se realizan los días viernes. Si tienes alguna duda con la conciliación bancaria, 
          puedes contactar directamente a conciliacion@safelunch.com con tu ID de escuela: <strong>{schoolId}</strong>.
        </p>
      </div>
    </div>
  );
}
