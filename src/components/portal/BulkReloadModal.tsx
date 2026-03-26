'use client';

import { useState, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import { Wallet, Users, CreditCard, RefreshCcw, AlertCircle, TrendingUp } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy');

const PLATFORM_FEE_PERCENTAGE = 0.12; // 12% fee as requested

function CheckoutForm({ amount, onSuccess }: { amount: string, onSuccess: () => void }) {
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
      confirmParams: { return_url: window.location.href } 
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
      {error && <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-200">{error}</div>}
      <button 
        disabled={isProcessing || !stripe} 
        className="w-full bg-[#635BFF] text-white font-black text-xl py-4 rounded-xl disabled:opacity-50 hover:bg-[#5851DF] transition shadow-lg active:scale-95"
      >
        {isProcessing ? 'Procesando...' : `Pagar Checkout Seguro`}
      </button>
    </form>
  )
}

export default function BulkReloadModal({ 
  consumers, 
  userProfile, 
  onSuccess 
}: { 
  consumers: any[], 
  userProfile: any, 
  onSuccess: () => void 
}) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [isGettingIntent, setIsGettingIntent] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleAmountChange = (walletId: string, value: string) => {
    setAmounts(prev => ({ ...prev, [walletId]: value }));
  };

  const allocations = useMemo(() => {
    return Object.entries(amounts)
      .filter(([_, val]) => val && !isNaN(Number(val)) && Number(val) > 0)
      .map(([walletId, val]) => ({
        walletId,
        amount: Number(val)
      }));
  }, [amounts]);

  const subtotal = allocations.reduce((acc, curr) => acc + curr.amount, 0);
  const fee = Math.round(subtotal * PLATFORM_FEE_PERCENTAGE * 100) / 100;
  const total = subtotal + fee;

  const handleStartReload = async () => {
    if (allocations.length === 0) {
      alert("Ingresa al menos un monto de recarga.");
      return;
    }

    setIsGettingIntent(true);
    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          allocations, 
          schoolId: userProfile?.school_id, 
          isBulk: true 
        })
      });
      const data = await res.json();

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setBreakdown(data.breakdown);
      } else {
        alert(data.error || 'Error configurando Stripe.');
      }
    } catch (e: any) {
      alert("Error de conexión: " + e.message);
    } finally {
      setIsGettingIntent(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-white p-12 rounded-3xl text-center space-y-6">
        <div className="h-24 w-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-5xl">✓</div>
        <h2 className="text-3xl font-black text-slate-900">¡Recarga Completada!</h2>
        <p className="text-slate-500 text-lg">Los fondos han sido distribuidos entre las billeteras de tus hijos.</p>
        <button 
          onClick={() => {
            onSuccess();
            router.refresh();
          }} 
          className="bg-slate-900 text-white font-black px-10 py-4 rounded-2xl hover:bg-slate-800 transition"
        >
          Cerrar y Actualizar Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-3xl max-w-2xl mx-auto w-full max-h-[90vh] overflow-y-auto">
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
          <div className="space-y-6">
            {consumers.map(student => (
              <div key={student.id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-xs font-black">
                    {student.first_name[0]}
                  </div>
                  <h3 className="font-black text-slate-700">{student.first_name} {student.last_name}</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {student.wallets?.map((wallet: any) => (
                    <div key={wallet.id}>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">
                        Recarga {wallet.type === 'snack' ? 'Snack' : 'Comedor'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input 
                          type="number"
                          placeholder="0.00"
                          value={amounts[wallet.id] || ''}
                          onChange={(e) => handleAmountChange(wallet.id, e.target.value)}
                          className="w-full pl-8 pr-4 py-3 font-bold text-slate-900 border border-slate-200 rounded-2xl focus:border-primary focus:outline-none bg-white transition"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-3xl space-y-4 shadow-xl">
            <div className="flex justify-between items-center text-sm font-bold text-slate-400">
              <span>Subtotal Recargas</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-slate-400">
              <span>Tarifa NutriPass (12%)</span>
              <span>${fee.toFixed(2)}</span>
            </div>
            <div className="h-px bg-slate-800 my-2" />
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
                {isGettingIntent ? <RefreshCcw className="h-5 w-5 animate-spin" /> : <><CreditCard className="h-5 w-5" /> Ir a Pagar</>}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-3">
            <h3 className="font-black text-slate-900 mb-2">Resumen de Pago</h3>
            {allocations.map(a => {
              const wallet = consumers.flatMap(c => c.wallets).find(w => w.id === a.walletId);
              const student = consumers.find(c => c.wallets.some((w: any) => w.id === a.walletId));
              return (
                <div key={a.walletId} className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{student.first_name} - {wallet.type}</span>
                  <span className="font-bold text-slate-700">${a.amount.toFixed(2)}</span>
                </div>
              )
            })}
            <div className="border-t border-slate-200 pt-3 flex justify-between font-black text-xl text-slate-900">
              <span>Total</span>
              <span className="text-primary">${breakdown?.total}</span>
            </div>
          </div>

          <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
            <CheckoutForm 
              amount={breakdown?.total} 
              onSuccess={() => setIsSuccess(true)} 
            />
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
