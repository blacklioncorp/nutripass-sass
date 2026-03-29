'use client';

import { useState } from 'react';
import { sendMataMermasReminder } from '@/app/(dashboard)/school/dashboardActions';
import { Zap, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SendReminderButton({ schoolId }: { schoolId: string }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [count, setCount] = useState(0);

  const handleSend = async () => {
    setStatus('loading');
    try {
      const res = await sendMataMermasReminder(schoolId);
      setCount(res.count ?? 0);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (e: any) {
      console.error(e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleSend}
        disabled={status === 'loading'}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95 disabled:opacity-70
          ${status === 'success' ? 'bg-emerald-500 text-white shadow-emerald-200' :
            status === 'error' ? 'bg-red-500 text-white' :
            'bg-[#f4c430] hover:bg-[#e6b310] text-[#1a3a5c] shadow-amber-200'}
        `}
      >
        {status === 'loading' ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
        ) : status === 'success' ? (
          <><CheckCircle2 className="h-4 w-4" /> ¡Enviado a {count}! </>
        ) : status === 'error' ? (
          <><AlertCircle className="h-4 w-4" /> Error al enviar</>
        ) : (
          <><span>⚡</span> ENVIAR RECORDATORIO MATA-MERMAS</>
        )}
      </button>

      {status === 'success' && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-emerald-100 text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold shadow-sm animate-in slide-in-from-top-2 duration-300">
          Se enviaron {count} notificaciones a padres sin pre-orden para mañana.
        </div>
      )}
    </div>
  );
}
