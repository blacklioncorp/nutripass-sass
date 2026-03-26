'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';

// Asegúrate de definir esto en el entorno del proyecto
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_dummy');

function CheckoutForm({ amount, onSuccess }: { amount: string, onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsProcessing(true);
    
    // Primero, llamamos a submit() validando que todo el Element está bien
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'Error en formulario.');
      setIsProcessing(false);
      return;
    }

    // Autorizamos confirmPayment usando redirección condicional
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required', 
      confirmParams: { return_url: window.location.href } 
    });

    if (confirmError) {
      setError(confirmError.message || 'Error procesando cobro con el banco.');
    } else {
      onSuccess();
    }
    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 mt-4 animate-in slide-in-from-bottom-2 fade-in">
      <PaymentElement />
      {error && <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl border border-red-200">{error}</div>}
      <button 
        disabled={isProcessing || !stripe} 
        className="w-full bg-[#635BFF] text-white font-black text-xl py-4 rounded-xl disabled:opacity-50 disabled:shadow-none hover:bg-[#5851DF] transition shadow-lg active:scale-95"
      >
        {isProcessing ? 'Procesando Transacción...' : `Pagar Checkout Seguro`}
      </button>
      <p className="text-xs text-center text-slate-400 font-medium">Pagos procesados por <b>Stripe 🔒</b></p>
    </form>
  )
}

export default function WalletReload({ walletId, schoolId, onSuccess }: { walletId: string, schoolId: string, onSuccess?: () => void }) {
  const [amount, setAmount] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [isGettingIntent, setIsGettingIntent] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const handleStartReload = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) < 50) {
      alert("El monto mínimo de recarga es $50.00");
      return;
    }

    setIsGettingIntent(true);
    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, walletId, schoolId })
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
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-green-200 text-center animate-in zoom-in-95">
        <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">✓</div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">¡Recarga Exitosa!</h2>
        <p className="text-slate-500 mb-6">Los fondos se han reflejado en la billetera virtual de forma instantánea.</p>
        <button 
          onClick={() => {
            if (onSuccess) onSuccess();
            router.refresh();
          }} 
          className="bg-slate-100 text-slate-600 font-bold px-6 py-3 rounded-xl hover:bg-slate-200 transition"
        >
          Cerrar y Actualizar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 max-w-lg mx-auto w-full">
      <h3 className="font-black text-slate-900 text-xl mb-4">Recargar Billetera</h3>
      
      {!clientSecret ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-600 mb-1">Monto a recargar (MXN)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">$</span>
              <input 
                type="number" 
                min="50"
                step="50"
                placeholder="500.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-4 text-2xl font-black text-slate-900 border-2 border-slate-200 rounded-xl focus:border-primary focus:outline-none transition"
              />
            </div>
          </div>
          <button 
            onClick={handleStartReload} 
            disabled={isGettingIntent || !amount}
            className="w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
          >
            {isGettingIntent ? 'Calculando Tarifas...' : 'Siguiente'}
          </button>
        </div>
      ) : (
        <div>
          <div className="bg-slate-50 p-6 rounded-2xl mb-6 border border-slate-200 space-y-2">
            <div className="flex justify-between font-bold text-slate-600">
              <span>Monto a recargar</span>
              <span>${breakdown?.recharge}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-500 text-sm">
              <span>Tarifa de servicio NutriPass</span>
              <span>+ ${breakdown?.fee}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 mt-2 flex justify-between font-black text-lg text-slate-900">
              <span>Total a pagar</span>
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
             className="w-full mt-4 text-slate-400 font-bold text-sm hover:text-slate-600"
          >
            Volver
          </button>
        </div>
      )}
    </div>
  );
}
