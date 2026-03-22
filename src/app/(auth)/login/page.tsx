'use client';

import { useActionState } from 'react';
import { loginAction } from './actions';
import { useTenant } from '@/components/providers/TenantProvider';

export default function LoginPage() {
  const { tenant } = useTenant();
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100">
        
        {/* Dynamic Tenant Branding Header */}
        <div className="flex flex-col items-center justify-center mb-8">
          {tenant?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo_url} alt={tenant.name} className="h-20 object-contain mb-4" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl mb-4 font-black">
              {tenant?.name?.charAt(0) || 'NP'}
            </div>
          )}
          <h2 className="text-2xl font-black text-slate-900 text-center">
            {tenant ? `Acceso a ${tenant.name}` : 'Acceso a NutriPass'}
          </h2>
          <p className="text-slate-500 text-sm mt-1 text-center">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        {/* Login Form using Server Actions */}
        <form action={formAction} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              name="email"
              placeholder="tu@correo.com" 
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña</label>
            <input 
              type="password" 
              name="password"
              placeholder="••••••••" 
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition" 
              required 
            />
          </div>

          {state?.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
              {state.error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isPending}
            className="w-full bg-primary text-white font-black py-4 rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.1)] hover:opacity-90 disabled:opacity-50 transition mt-2"
          >
            {isPending ? 'AUTENTICANDO...' : 'INGRESAR'}
          </button>
        </form>

      </div>

      <div className="mt-8 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} NutriPass SaaS Platform</p>
      </div>
    </div>
  );
}
