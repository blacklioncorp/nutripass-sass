'use client';

import { useActionState, useState } from 'react';
import { loginAction, signUpAction } from './actions';
import { useTenant } from '@/components/providers/TenantProvider';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { tenant } = useTenant();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [state, formAction, isPending] = useActionState(
    isSignUp ? signUpAction : loginAction, 
    null
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-primary blur-[120px]" />
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] max-w-md w-full border border-slate-100/50 backdrop-blur-sm z-10 animate-in fade-in zoom-in duration-500">
        
        {/* Dynamic Tenant Branding Header */}
        <div className="flex flex-col items-center justify-center mb-10">
          {tenant?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.logo_url} alt={tenant.name} className="h-16 object-contain mb-6 drop-shadow-sm" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="https://juautqvqptburnflbolm.supabase.co/storage/v1/object/public/school_assets/SafeLunch.png" alt="Logo de SafeLunch" className="w-40 h-auto object-contain mb-6 drop-shadow-sm" />
          )}
          <h2 className="text-3xl font-black text-slate-900 text-center tracking-tight leading-tight">
            {isSignUp ? 'Crea tu cuenta familiar 👨‍👩‍👧‍👦' : '¡Hola de nuevo! 👋'}
          </h2>
          <p className="text-slate-400 font-bold mt-2 text-center text-sm">
            {isSignUp 
              ? 'Únete a la red SafeLunch escolar' 
              : `Bienvenido a ${tenant?.name || 'SafeLunch'}`}
          </p>
        </div>

        {/* Form using Server Actions */}
        <form action={formAction} className="flex flex-col gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Correo Electrónico</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                <Mail className="h-5 w-5" />
              </div>
              <input 
                type="email" 
                name="email"
                placeholder="tu@correo.com" 
                className="w-full pl-12 pr-4 py-4 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary focus:outline-none transition-all placeholder:text-slate-300 bg-slate-50/50 font-medium" 
                required 
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end ml-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contraseña</label>
              {!isSignUp && (
                <a href="#" className="text-[10px] font-black text-primary/60 hover:text-primary uppercase tracking-widest transition-colors mb-0.5">
                  ¿Olvidaste tu contraseña?
                </a>
              )}
            </div>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                <Lock className="h-5 w-5" />
              </div>
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="password"
                placeholder="••••••••" 
                className="w-full pl-12 pr-12 py-4 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-primary/5 focus:border-primary focus:outline-none transition-all placeholder:text-slate-300 bg-slate-50/50 font-medium" 
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors p-1"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {state?.error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
              <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm text-lg">⚠️</div>
              <p className="flex-1 leading-relaxed">{state.error}</p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isPending}
            className={`w-full text-white font-black py-5 rounded-[1.25rem] shadow-xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 transition-all duration-300 mt-2 text-xs uppercase tracking-[0.25em] flex items-center justify-center gap-3 group ${
              isSignUp ? 'bg-emerald-500 shadow-emerald-200 hover:bg-emerald-600' : 'bg-primary shadow-blue-100 hover:bg-[#003a6b]'
            }`}
          >
            {isPending 
              ? (isSignUp ? 'CREANDO CUENTA...' : 'AUTENTICANDO...') 
              : (isSignUp ? 'REGISTRARME' : 'INGRESAR')}
            {!isPending && <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-slate-50 text-center">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
            {isSignUp ? '¿Ya tienes cuenta?' : '¿Aún no tienes cuenta?'}
          </p>
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setShowPassword(false);
            }}
            className={`font-black text-sm mt-3 px-8 py-3 rounded-full border-2 transition-all active:scale-95 ${
              isSignUp 
                ? 'text-primary border-primary/10 hover:bg-primary/5 hover:border-primary/30' 
                : 'text-emerald-500 border-emerald-500/10 hover:bg-emerald-50/50 hover:border-emerald-500/30'
            }`}
          >
            {isSignUp ? 'Inicia Sesión aquí' : 'Crea tu cuenta aquí'}
          </button>
        </div>

      </div>

      <div className="mt-12 text-center text-slate-300 text-[9px] font-black uppercase tracking-[0.4em] opacity-50">
        <p>&copy; {new Date().getFullYear()} SafeLunch SaaS Ecosystem</p>
      </div>
    </div>
  );
}
