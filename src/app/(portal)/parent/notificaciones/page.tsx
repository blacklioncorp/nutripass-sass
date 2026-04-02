import { createClient } from '@/utils/supabase/server';
import { Bell, Receipt, Clock, CheckCircle2, FileText, ChevronRight } from 'lucide-react';

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

  // 2. Fetch transactions of type 'credit' (recharges)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .in('consumer_id', consumerIds)
    .eq('transaction_type', 'credit')
    .order('created_at', { ascending: false });

  // 3. Group by stripe_payment_intent_id to consolidate multi-student recharges
  const receiptsMap = new Map();

  transactions?.forEach(tx => {
    const key = tx.stripe_payment_intent_id || `manual-${tx.id}`;
    if (!receiptsMap.has(key)) {
      receiptsMap.set(key, {
        intentId: tx.stripe_payment_intent_id,
        amount: 0,
        createdAt: tx.created_at,
        description: tx.description || 'Recarga de Saldo',
        status: 'success'
      });
    }
    receiptsMap.get(key).amount += tx.amount;
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
            <ReceiptCard key={idx} receipt={receipt} />
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

function ReceiptCard({ receipt }: { receipt: any }) {
  const date = new Date(receipt.createdAt);
  const formattedDate = date.toLocaleDateString('es-MX', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const formattedTime = date.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group active:scale-[0.98] relative overflow-hidden">
      {/* Visual Accent */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
        <Receipt className="h-24 w-24 rotate-12" />
      </div>

      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-200/20 border border-emerald-100 flex-shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="font-black text-[#004B87] text-lg leading-tight uppercase tracking-tight">Recarga Exitosa</p>
            <div className="flex items-center gap-2 text-slate-400 mt-1.5">
              <Clock className="h-3 w-3" />
              <p className="text-[10px] font-bold uppercase tracking-widest">{formattedDate}, {formattedTime}</p>
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-3xl font-black text-[#004B87] tabular-nums tracking-tighter">${receipt.amount.toFixed(2)}</p>
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 inline-block mt-1">Confirmado</span>
        </div>
      </div>

      <div className="h-px bg-slate-50 w-full mb-6" />

      <div className="flex flex-col sm:flex-row justify-between items-center gap-5">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="h-8 w-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
            <FileText className="h-4 w-4" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 truncate max-w-[200px] uppercase tracking-wider">REF: {receipt.intentId?.slice(-12) || 'NP-INTERNAL'}</p>
        </div>
        
        <button 
          disabled 
          className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3.5 bg-slate-50/50 rounded-xl text-slate-300 font-black text-[10px] uppercase tracking-widest border border-slate-100 cursor-not-allowed group-hover:bg-white transition-all"
        >
          🔜 Solicitar Factura
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
