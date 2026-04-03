'use client';

import { useState } from 'react';
import { 
  Receipt, 
  Clock, 
  CheckCircle2, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  User,
  Tags
} from 'lucide-react';
import TransactionReceiptModal from './TransactionReceiptModal';

type Detail = {
  id: string;
  student: string;
  walletType: string;
  amount: number;
};

type ReceiptGroup = {
  intentId: string;
  amount: number;
  createdAt: string;
  description: string;
  status: string;
  representativeTransactionId: string;
  details: Detail[];
};

export default function ReceiptConsolidatedCard({ receipt }: { receipt: ReceiptGroup }) {
  const [showDetails, setShowDetails] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const representativeTransaction = {
    id: receipt.representativeTransactionId,
    amount: receipt.amount,
    transaction_type: 'credit',
    description: receipt.description,
    created_at: receipt.createdAt
  };

  return (
    <>
      <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
        {/* Visual Accent */}
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Receipt className="h-24 w-24 rotate-12" />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start mb-6 relative z-10 gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-200/20 border border-emerald-100 flex-shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-black text-[#004B87] text-lg leading-tight uppercase tracking-tight">Recarga Exitosa</p>
                {receipt.details.length > 1 && (
                  <span className="text-[10px] font-black bg-[#004B87]/5 text-[#004B87] px-2 py-0.5 rounded-full border border-[#004B87]/10 uppercase">
                    Múltiple
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-slate-400 mt-1.5">
                <Clock className="h-3 w-3" />
                <p className="text-[10px] font-bold uppercase tracking-widest">{formattedDate}, {formattedTime}</p>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0 w-full sm:w-auto">
            <p className="text-3xl font-black text-[#004B87] tabular-nums tracking-tighter">${receipt.amount.toFixed(2)}</p>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 inline-block mt-1">Confirmado</span>
          </div>
        </div>

        {/* Breakdown Toggle */}
        <div className="mb-6">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-[10px] font-black text-[#7CB9E8] uppercase tracking-widest hover:text-[#004B87] transition-colors"
          >
            {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showDetails ? 'Ocultar desglose' : 'Ver desglose por billetera'}
          </button>

          {showDetails && (
            <div className="mt-4 space-y-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 animate-in slide-in-from-top-2 duration-300">
              {receipt.details.map((detail, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-blue-50 text-[#004B87] rounded-lg flex items-center justify-center">
                      {detail.walletType === 'comedor' ? <User className="h-4 w-4" /> : <Tags className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[#004B87] uppercase tracking-tight">{detail.student}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        Billetera {detail.walletType === 'comedor' ? 'Comedor' : 'Snacks'}
                      </p>
                    </div>
                  </div>
                  <p className="font-black text-[#004B87] text-sm tabular-nums">${detail.amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
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
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3.5 bg-[#004B87] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#003a6b] transition-all shadow-md shadow-blue-100"
          >
            📄 Solicitar Factura
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      <TransactionReceiptModal 
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        transaction={representativeTransaction}
      />
    </>
  );
}
