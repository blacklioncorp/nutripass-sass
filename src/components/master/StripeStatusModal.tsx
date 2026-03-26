'use client';

import { CheckCircle2, XCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  schoolName: string;
  stripeAccountId: string | null;
  onboardingComplete: boolean;
};

export default function StripeStatusModal({
  isOpen,
  onOpenChange,
  schoolName,
  stripeAccountId,
  onboardingComplete,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (stripeAccountId) {
      navigator.clipboard.writeText(stripeAccountId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl p-6 border-none shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-[#0d1f3c] tracking-tight">
            Configuración de Stripe
          </DialogTitle>
          <DialogDescription className="text-[#8aa8cc] font-medium">
            Estado de la pasarela de pagos para <strong>{schoolName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Status Indicator */}
          <div className={`flex items-center gap-4 p-4 rounded-2xl border ${
            onboardingComplete 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
              : 'bg-amber-50 border-amber-100 text-amber-700'
          }`}>
            {onboardingComplete ? (
              <CheckCircle2 className="h-6 w-6 flex-shrink-0" />
            ) : (
              <XCircle className="h-6 w-6 flex-shrink-0" />
            )}
            <div>
              <p className="font-black text-sm uppercase tracking-wide">
                Onboarding: {onboardingComplete ? 'Completado' : 'Pendiente'}
              </p>
              <p className="text-xs font-semibold opacity-80 mt-0.5">
                {onboardingComplete 
                  ? 'La escuela ya puede recibir pagos con tarjeta.' 
                  : 'La escuela aún no ha configurado su cuenta bancaria.'}
              </p>
            </div>
          </div>

          {/* Account ID Field */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[#8aa8cc] uppercase tracking-widest ml-1">
              Stripe Account ID
            </label>
            <div className="flex gap-2">
              <div className="flex-1 bg-[#f0f5fb] border border-[#e8f0f7] rounded-xl px-4 py-3 font-mono text-sm text-[#0d1f3c] overflow-hidden text-ellipsis whitespace-nowrap">
                {stripeAccountId || 'No generado'}
              </div>
              <button
                onClick={handleCopy}
                disabled={!stripeAccountId}
                className="bg-white border border-[#e8f0f7] p-3 rounded-xl hover:bg-[#f0f5fb] transition shadow-sm disabled:opacity-40"
                title="Copiar ID"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-[#7CB9E8]" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="bg-[#0d1f3c] text-white font-black text-sm px-6 py-3 rounded-xl hover:bg-[#003870] transition shadow-md"
          >
            Entendido
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
