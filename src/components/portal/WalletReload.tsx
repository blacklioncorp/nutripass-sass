'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

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
  const [minAmount, setMinAmount] = useState<number | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch school settings to get min_recharge_amount
  useEffect(() => {
    async function fetchSettings() {
      // Immediate validation of schoolId
      if (!schoolId || schoolId.trim() === '') {
        console.error('WalletReload: schoolId is missing or empty');
        setValidationError('Error de vinculación escolar: ID de escuela no encontrado.');
        setLoadingSettings(false);
        return;
      }

      setLoadingSettings(true);
      setError(null);
      setValidationError(null);

      try {
        const { createClient } = await import('@/utils/supabase/client');
        const supabase = createClient();
        const { data, error: fetchErr } = await supabase
          .from('schools')
          .select('settings')
          .eq('id', schoolId)
          .single();
        
        if (fetchErr) throw fetchErr;

        const val = (data?.settings as any)?.financial?.min_recharge;
        if (val !== undefined && val !== null) {
          setMinAmount(Number(val));
        } else {
          setMinAmount(100); // Fallback
        }
      } catch (e: any) {
        console.error('Error fetching min amount:', e);
        setError('No se pudo obtener la configuración de recarga de la escuela.');
      } finally {
        setLoadingSettings(false);
      }
    }
    fetchSettings();
  }, [schoolId]);

  const handleStartReload = async () => {
    if (minAmount === null) return;
    
    if (!amount || isNaN(Number(amount)) || Number(amount) < minAmount) {
      alert(`El monto mínimo de recarga configurado por tu escuela es $${minAmount.toFixed(2)}`);
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

  const SkeletonReload = () => (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-32 bg-slate-100 rounded-lg"></div>
        <div className="h-14 w-full bg-slate-50 rounded-2xl border border-slate-100"></div>
        <div className="h-3 w-48 bg-slate-50 rounded-lg"></div>
      </div>
      <div className="h-14 w-full bg-slate-100 rounded-2xl"></div>
    </div>
  );

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
      <h3 className="font-black text-slate-900 text-xl mb-6">Recargar Billetera</h3>
      
      {loadingSettings ? (
        <SkeletonReload />
      ) : validationError ? (
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl text-center space-y-3">
          <div className="h-12 w-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="text-red-600 font-black text-sm uppercase tracking-tight">{validationError}</p>
          <p className="text-red-400 text-[10px] font-medium">Contacta al administrador del colegio para verificar tu cuenta.</p>
        </div>
      ) : !clientSecret ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Monto a recargar (MXN)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xl">$</span>
              <input 
                type="number" 
                min={minAmount ?? 0}
                step="50"
                placeholder={String(minAmount ?? 100)}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full pl-10 pr-4 py-4 text-2xl font-black text-slate-900 border-2 rounded-2xl focus:border-[#7CB9E8] focus:outline-none transition-all ${minAmount && Number(amount) < minAmount && amount ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50/30'}`}
              />
            </div>
            {error ? (
              <p className="text-[10px] text-red-500 font-black uppercase tracking-widest mt-2 ml-1">
                ⚠️ {error}
              </p>
            ) : minAmount !== null && (
              <p className="text-[10px] text-[#8aa8cc] font-black uppercase tracking-widest mt-2 ml-1">
                Recarga mínima: <span className={Number(amount) < minAmount && amount ? 'text-red-500' : 'text-[#7CB9E8]'}>${minAmount.toFixed(2)} MXN</span>
              </p>
            )}
          </div>
          <button 
            onClick={handleStartReload} 
            disabled={isGettingIntent || !!error}
            className="w-full bg-[#004B87] hover:bg-[#003a6b] text-white font-black py-4 rounded-2xl text-lg shadow-xl shadow-blue-500/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale mt-2"
          >
            {isGettingIntent ? (
              <div className="flex items-center justify-center gap-3">
                <RefreshCcw className="h-5 w-5 animate-spin" />
                <span>Procesando...</span>
              </div>
            ) : (
              'Siguiente'
            )}
          </button>
        </div>
      ) : (
        <div>
          <div className="bg-slate-50 p-6 rounded-2xl mb-6 border border-slate-100 space-y-2">
            <div className="flex justify-between font-bold text-slate-600">
              <span>Monto a recargar</span>
              <span>${breakdown?.recharge}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-400 text-sm">
              <span>Tarifa de servicio SafeLunch</span>
              <span>+ ${breakdown?.fee}</span>
            </div>
            <div className="border-t border-slate-200 pt-3 mt-3 flex justify-between font-black text-xl text-slate-900">
              <span>Total a pagar</span>
              <span className="text-[#004B87]">${breakdown?.total}</span>
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
             className="w-full mt-6 text-slate-400 font-bold text-sm hover:text-[#004B87] transition-colors"
          >
            Volver a editar monto
          </button>
        </div>
      )}
    </div>
  );
}
