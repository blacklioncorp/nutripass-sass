'use client';

import { useActionState, useState } from 'react';
import { loginAction, signUpAction } from './actions';
import { useTenant } from '@/components/providers/TenantProvider';

export default function LoginPage() {
  const { tenant } = useTenant();
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [state, formAction, isPending] = useActionState(
    isSignUp ? signUpAction : loginAction, 
    null
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-100 transition-all duration-300">
        
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
          <h2 className="text-2xl font-black text-slate-900 text-center tracking-tight">
            {isSignUp ? 'Crear Cuenta' : (tenant ? `Acceso a ${tenant.name}` : 'Acceso a NutriPass')}
          </h2>
          <p className="text-slate-500 text-sm mt-1 text-center">
            {isSignUp 
              ? 'Regístrate con el correo que diste a la escuela' 
              : 'Ingresa tus credenciales para continuar'}
          </p>
        </div>

        {/* Form using Server Actions */}
        <form action={formAction} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">Correo Electrónico</label>
            <input 
              type="email" 
              name="email"
              placeholder="tu@correo.com" 
              className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all placeholder:text-slate-300" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">Contraseña</label>
            <input 
              type="password" 
              name="password"
              placeholder="••••••••" 
              className="w-full p-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none transition-all placeholder:text-slate-300" 
              required 
            />
          </div>

          {state?.error && (
            <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-bold border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
              <span className="text-base leading-none">⚠️</span>
              {state.error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isPending}
            className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-[0_10px_20px_-10px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_25px_-10px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all duration-200 mt-2 text-sm uppercase tracking-widest"
          >
            {isPending 
              ? (isSignUp ? 'CREANDO CUENTA...' : 'AUTENTICANDO...') 
              : (isSignUp ? 'REGISTRARME' : 'INGRESAR')}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-50 text-center">
          <p className="text-slate-400 text-sm">
            {isSignUp ? '¿Ya tienes cuenta?' : '¿Eres nuevo papá?'}
          </p>
          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-bold text-sm mt-1 hover:underline underline-offset-4"
          >
            {isSignUp ? 'Inicia Sesión aquí' : 'Crea tu cuenta aquí'}
          </button>
        </div>

      </div>

      <div className="mt-12 text-center text-slate-300 text-[10px] font-bold uppercase tracking-[0.2em]">
        <p>&copy; {new Date().getFullYear()} NutriPass SaaS Platform</p>
      </div>
    </div>
  );
}
