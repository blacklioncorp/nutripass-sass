'use client';

import { useState, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import { TrendingUp, CreditCard, RefreshCcw } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy');
const PLATFORM_FEE_PERCENTAGE = 0.12;

// ─── Checkout Form ────────────────────────────────────────────────────────────
function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Error en formulario.');
      setIsProcessing(false);
      return;
    }

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: window.location.href },
    });

    if (confirmError) {
      setError(confirmError.message || 'Error procesando cobro.');
    } else {
      onSuccess();
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-4">
      <PaymentElement />
      {error && (
        <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-200">
          {error}
        </div>
      )}
      <button
        disabled={isProcessing || !stripe}
        className="w-full bg-[#635BFF] text-white font-black text-xl py-4 rounded-xl disabled:opacity-50 hover:bg-[#5851DF] transition shadow-lg active:scale-95"
      >
        {isProcessing ? 'Procesando...' : 'Pagar Checkout Seguro 🔒'}
      </button>
    </form>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BulkReloadModal({
  consumers,
  userProfile,
  onSuccess,
}: {
  consumers: any[];
  userProfile: any;
  onSuccess: () => void;
}) {
  // State: { [studentId]: { comedor: string, snack: string } }
  const [amounts, setAmounts] = useState<Record<string, { comedor: string; snack: string }>>(() =>
    Object.fromEntries(consumers.map((c) => [c.id, { comedor: '', snack: '' }]))
  );

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [isGettingIntent, setIsGettingIntent] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleAmountChange = (studentId: string, walletType: 'comedor' | 'snack', value: string) => {
    setAmounts((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [walletType]: value },
    }));
  };

  // Build allocations: [{ walletId, amount }] for each non-zero input
  const allocations = useMemo(() => {
    const result: { walletId: string; amount: number }[] = [];
    for (const student of consumers) {
      for (const wType of ['comedor', 'snack'] as const) {
        const val = amounts[student.id]?.[wType];
        const num = Number(val);
        if (val && !isNaN(num) && num > 0) {
          const wallet = student.wallets?.find((w: any) => w.type === wType);
          if (wallet) {
            result.push({ walletId: wallet.id, amount: num });
          }
        }
      }
    }
    return result;
  }, [amounts, consumers]);

  const subtotal = allocations.reduce((acc, a) => acc + a.amount, 0);
  const fee = Math.round(subtotal * PLATFORM_FEE_PERCENTAGE * 100) / 100;
  const total = subtotal + fee;

  const handleStartReload = async () => {
    if (allocations.length === 0) {
      alert('Ingresa al menos un monto de recarga.');
      return;
    }
    setIsGettingIntent(true);
    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations, schoolId: userProfile?.school_id, isBulk: true }),
      });
      const data = await res.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setBreakdown(data.breakdown);
      } else {
        alert(data.error || 'Error configurando Stripe.');
      }
    } catch (e: any) {
      alert('Error de conexión: ' + e.message);
    } finally {
      setIsGettingIntent(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-white p-12 rounded-3xl text-center space-y-6">
        <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-5xl">
          ✓
        </div>
        <h2 className="text-3xl font-black text-slate-900">¡Recarga Completada!</h2>
        <p className="text-slate-500 text-lg">Los fondos han sido distribuidos entre las billeteras de tus hijos.</p>
        <button
          onClick={() => { onSuccess(); router.refresh(); }}
          className="bg-slate-900 text-white font-black px-10 py-4 rounded-2xl hover:bg-slate-800 transition"
        >
          Cerrar y Actualizar Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-3xl max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-12 w-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
          <TrendingUp className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Recarga Múltiple</h1>
          <p className="text-slate-500 font-medium tracking-tight">Carga saldo a todos tus hijos en un solo pago.</p>
        </div>
      </div>

      {!clientSecret ? (
        <div className="space-y-8">
          {/* ── Per-student inputs ── */}
          <div className="space-y-5">
            {consumers.map((student) => (
              <div key={student.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                {/* Student name */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-9 w-9 bg-[#004B87] text-white rounded-full flex items-center justify-center text-sm font-black flex-shrink-0">
                    {student.first_name?.[0]}
                  </div>
                  <h3 className="font-black text-slate-800 text-base">
                    {student.first_name} {student.last_name}
                  </h3>
                </div>

                {/* Two inputs side by side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Comedor */}
                  <div>
                    <label className="block text-[10px] font-black text-[#004B87] uppercase tracking-widest mb-1.5 ml-1">
                      🍽 Monto Comedor
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        placeholder="0.00"
                        value={amounts[student.id]?.comedor || ''}
                        onChange={(e) => handleAmountChange(student.id, 'comedor', e.target.value)}
                        className="w-full pl-7 pr-3 py-3 font-bold text-slate-900 border border-slate-200 rounded-2xl focus:border-[#7CB9E8] focus:outline-none bg-white transition text-sm"
                      />
                    </div>
                  </div>

                  {/* Snack */}
                  <div>
                    <label className="block text-[10px] font-black text-[#7CB9E8] uppercase tracking-widest mb-1.5 ml-1">
                      🍎 Monto Snack
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                      <input
                        type="number"
                        min="0"
                        step="50"
                        placeholder="0.00"
                        value={amounts[student.id]?.snack || ''}
                        onChange={(e) => handleAmountChange(student.id, 'snack', e.target.value)}
                        className="w-full pl-7 pr-3 py-3 font-bold text-slate-900 border border-slate-200 rounded-2xl focus:border-[#7CB9E8] focus:outline-none bg-white transition text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Mini subtotal per student */}
                {(Number(amounts[student.id]?.comedor) + Number(amounts[student.id]?.snack)) > 0 && (
                  <p className="text-right text-xs font-black text-slate-400 mt-3">
                    Subtotal {student.first_name}:{' '}
                    <span className="text-[#004B87]">
                      ${(Number(amounts[student.id]?.comedor || 0) + Number(amounts[student.id]?.snack || 0)).toFixed(2)}
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* ── Total summary + CTA ── */}
          <div className="bg-slate-900 text-white p-8 rounded-3xl space-y-4 shadow-xl">
            <div className="flex justify-between text-sm font-bold text-slate-400">
              <span>Subtotal Recargas</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-400">
              <span>Tarifa NutriPass (12%)</span>
              <span>${fee.toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-800" />
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest">total a pagar</p>
                <p className="text-4xl font-black">${total.toFixed(2)}</p>
              </div>
              <button
                onClick={handleStartReload}
                disabled={isGettingIntent || allocations.length === 0}
                className="bg-primary hover:bg-blue-600 text-white font-black px-8 py-4 rounded-2xl transition disabled:opacity-50 active:scale-95 flex items-center gap-2"
              >
                {isGettingIntent
                  ? <RefreshCcw className="h-5 w-5 animate-spin" />
                  : <><CreditCard className="h-5 w-5" /> Ir a Pagar</>}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Stripe checkout step ── */
        <div className="space-y-6">
          {/* Payment summary */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3">
            <h3 className="font-black text-slate-900 mb-2">Resumen de Pago</h3>
            {allocations.map((a) => {
              const wallet = consumers.flatMap((c) => c.wallets ?? []).find((w: any) => w.id === a.walletId);
              const student = consumers.find((c) => c.wallets?.some((w: any) => w.id === a.walletId));
              const typeLabel = wallet?.type === 'snack' ? 'Snack' : 'Comedor';
              return (
                <div key={a.walletId} className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">
                    {student?.first_name} — {typeLabel}
                  </span>
                  <span className="font-bold text-slate-700">${a.amount.toFixed(2)}</span>
                </div>
              );
            })}
            <div className="border-t border-slate-200 pt-3 flex justify-between font-black text-xl text-slate-900">
              <span>Total</span>
              <span className="text-primary">${breakdown?.total}</span>
            </div>
          </div>

          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <CheckoutForm onSuccess={() => setIsSuccess(true)} />
          </Elements>

          <button
            onClick={() => { setClientSecret(null); setBreakdown(null); }}
            className="w-full text-slate-400 font-bold text-sm hover:text-slate-600 transition"
          >
            ← Volver a editar montos
          </button>
        </div>
      )}
    </div>
  );
}
