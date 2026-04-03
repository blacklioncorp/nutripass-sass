'use client';

import React, { useState } from 'react';
import { CreditCard, Mail, Clock, Save, Building2, CheckCircle2 } from 'lucide-react';
import { updateOperationalSettings } from '@/app/(dashboard)/school/settings/actions';

interface OperationalSettingsFormProps {
  initialData: {
    billing_email: string | null;
    opening_time: string | null;
    closing_time: string | null;
  };
}

export default function OperationalSettingsForm({ initialData }: OperationalSettingsFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = await updateOperationalSettings(formData);

    if (result.success) {
      setMessage({ type: 'success', text: 'Configuración operativa guardada con éxito.' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al guardar.' });
    }
    setIsSaving(false);
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Column: Operation & Billing */}
        <div className="space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-5 w-5 text-[#2b5fa6]" />
            <h3 className="text-lg font-black text-[#1a3a5c] tracking-tight uppercase italic">Operación y Facturación</h3>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-[#e8f0f7] shadow-sm space-y-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black text-[#8aa8cc] uppercase tracking-widest px-1">
                <Mail className="h-3 w-3" /> Correo de Facturación
              </label>
              <input 
                type="email"
                name="billing_email"
                defaultValue={initialData.billing_email || ''}
                placeholder="facturas@colegio.edu.mx"
                className="w-full bg-[#f8fafc] border-2 border-transparent focus:border-[#7CB9E8] focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-[#1a3a5c] transition-all outline-none"
              />
              <p className="text-[10px] text-slate-400 font-medium px-1 italic">
                Aquí recibirás las peticiones de factura de los padres de familia.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black text-[#8aa8cc] uppercase tracking-widest px-1">
                  <Clock className="h-3 w-3" /> Apertura
                </label>
                <input 
                  type="time"
                  name="opening_time"
                  defaultValue={initialData.opening_time || '07:00'}
                  className="w-full bg-[#f8fafc] border-2 border-transparent focus:border-[#7CB9E8] focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-[#1a3a5c] transition-all outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black text-[#8aa8cc] uppercase tracking-widest px-1">
                  <Clock className="h-3 w-3" /> Cierre
                </label>
                <input 
                  type="time"
                  name="closing_time"
                  defaultValue={initialData.closing_time || '15:00'}
                  className="w-full bg-[#f8fafc] border-2 border-transparent focus:border-[#7CB9E8] focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-[#1a3a5c] transition-all outline-none"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSaving}
            className="flex items-center justify-center gap-3 w-full bg-[#1a3a5c] text-white font-black py-5 rounded-[2rem] hover:bg-[#0d1f3c] transition-all shadow-xl shadow-blue-900/10 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            {isSaving ? 'GUARDANDO...' : 'GUARDAR AJUSTES OPERATIVOS'}
          </button>

          {message && (
            <div className={`flex items-center gap-2 p-4 rounded-2xl text-xs font-bold animate-in zoom-in-95 duration-300 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              {message.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : '⚠️'}
              {message.text}
            </div>
          )}
        </div>

        {/* Right Column: Stripe Connect Premium Card */}
        <div className="space-y-8">
           <div className="flex items-center gap-3 mb-2">
            <CreditCard className="h-5 w-5 text-[#6366f1]" />
            <h3 className="text-lg font-black text-[#1a3a5c] tracking-tight uppercase italic">Finanzas y Pagos</h3>
          </div>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-white p-10 rounded-[3rem] border border-[#f0f4f8] shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                {/* Visual Accent */}
                <div className="absolute -right-16 -top-16 h-64 w-64 bg-indigo-50 rounded-full opacity-50 blur-3xl pointer-events-none" />
                
                <div className="flex flex-col flex-1 relative z-10">
                  <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-200">
                    <CreditCard className="h-7 w-7" />
                  </div>
                  
                  <h4 className="text-3xl font-black text-[#1a3a5c] tracking-tight mb-4">Recibe tus ganancias en automático</h4>
                  <p className="text-slate-500 font-medium leading-relaxed mb-8">
                    Vincula tu cuenta bancaria a través de **Stripe Connect** para transferir los ingresos semanales de la cafetería de forma segura y automatizada.
                  </p>

                  <ul className="space-y-4 mb-10">
                    {['Pagos instantáneos', 'Conciliación bancaria', 'Soporte SPEI y Tarjetas'].map(feature => (
                      <li key={feature} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                        <div className="h-2 w-2 rounded-full bg-indigo-400" /> {feature}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto">
                    <button 
                      type="button"
                      disabled
                      className="w-full bg-[#6366f1] text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 group-hover:scale-[1.02] transition-transform flex items-center justify-center gap-3 cursor-not-allowed opacity-90"
                    >
                      💳 Vincular Cuenta Bancaria (Stripe Connect)
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full uppercase ml-1">Próximamente</span>
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">
                       Configuración de pasarela de pagos NutriPass
                    </p>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
