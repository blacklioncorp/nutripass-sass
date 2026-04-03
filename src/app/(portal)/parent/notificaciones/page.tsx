import { createClient } from '@/utils/supabase/server';
import { Bell, Receipt } from 'lucide-react';
import ReceiptConsolidatedCard from '@/components/portal/ReceiptConsolidatedCard';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // 1. Fetch consumer IDs for this parent
  const { data: consumers } = await supabase
    .from('consumers')
    .select('id')
    .eq('parent_id', user.id);

  const consumerIds = consumers?.map(c => c.id) || [];

  // 2. Fetch transactions of type 'credit' (recharges) with joined info
  // We use the exact join path found in the dashboard: wallets(type, consumers(first_name, last_name))
  const { data: transactions } = await supabase
    .from('transactions')
    .select(`
      *,
      wallets (
        type,
        consumers (
          first_name,
          last_name
        )
      )
    `)
    .in('consumer_id', consumerIds)
    .eq('transaction_type', 'credit')
    .order('created_at', { ascending: false });

  // 3. Group by stripe_payment_intent_id to consolidate multi-wallet recharges
  const receiptsMap = new Map();

  transactions?.forEach(tx => {
    const key = tx.stripe_payment_intent_id || `manual-${tx.id}`;
    
    // Extract info from joined data
    const walletType = tx.wallets?.type || 'comedor';
    const studentName = tx.wallets?.consumers 
      ? `${tx.wallets.consumers.first_name} ${tx.wallets.consumers.last_name}`.trim()
      : 'Estudiante';

    if (!receiptsMap.has(key)) {
      receiptsMap.set(key, {
        intentId: tx.stripe_payment_intent_id,
        amount: 0,
        createdAt: tx.created_at,
        description: tx.description || 'Recarga de Saldo',
        status: 'success',
        representativeTransactionId: tx.id,
        details: []
      });
    }
    
    const entry = receiptsMap.get(key);
    entry.amount += tx.amount;
    entry.details.push({
      id: tx.id,
      student: studentName,
      walletType: walletType,
      amount: tx.amount
    });
  });

  const receipts = Array.from(receiptsMap.values());

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
      {/* Header Section */}
      <div className="flex items-center gap-5 p-2">
        <div className="h-16 w-16 bg-[#004B87]/10 text-[#004B87] rounded-[2rem] flex items-center justify-center shadow-sm border border-blue-100/50">
          <Bell className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-[#004B87] tracking-tight leading-tight">Notificaciones</h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Historial de Recibos y Alertas</p>
        </div>
      </div>

      {/* Receipts History */}
      <div className="space-y-4">
        {receipts.length === 0 ? (
          <div className="bg-white p-16 rounded-[2.5rem] border border-slate-100 text-center shadow-sm">
            <Receipt className="h-16 w-16 text-slate-100 mx-auto mb-4 scale-125" />
            <p className="text-slate-400 font-bold text-lg">No hay notificaciones aún</p>
            <p className="text-slate-300 text-sm mt-1">Tus recibos de recarga aparecerán aquí conforme los realices.</p>
          </div>
        ) : (
          receipts.map((receipt, idx) => (
            <ReceiptConsolidatedCard key={idx} receipt={receipt} />
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-8 text-center">
        <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.3em]">NutriPass Receipts Ecosystem</p>
      </div>
    </div>
  );
}
