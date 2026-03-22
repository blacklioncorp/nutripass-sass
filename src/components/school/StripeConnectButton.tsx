'use client';

import { useState } from 'react';

export default function StripeConnectButton({ isConnected }: { isConnected: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/onboarding', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error);
        setLoading(false);
      }
    } catch(err: any) {
      alert("Error iniciando Stripe Connect: " + err.message);
      setLoading(false);
    }
  }

  if (isConnected) {
    return (
      <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 font-bold flex items-center gap-3 w-fit shadow-sm">
        <span className="text-xl">✅</span> 
        <div>
          <p className="leading-tight">Cuenta Activa Verificada</p>
          <p className="text-xs font-medium text-green-600">NutriPass enrutará transacciones directamente a tu banco local.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div>
         <h4 className="font-black text-slate-800 text-lg mb-1">Recibir Pagos en Línea</h4>
         <p className="text-sm text-slate-500">Conecta tu cuenta de forma 100% segura usando Stripe para empezar a recibir recargas de los padres hacia el comedor escolar.</p>
      </div>
      <button 
        onClick={handleConnect} 
        disabled={loading} 
        className="bg-[#635BFF] hover:bg-[#5851df] text-white font-black px-6 py-3 rounded-xl transition shadow active:scale-95 whitespace-nowrap"
      >
        {loading ? 'Redirigiendo a Stripe...' : '⚡ Conectar Banco (Stripe)'}
      </button>
    </div>
  );
}
