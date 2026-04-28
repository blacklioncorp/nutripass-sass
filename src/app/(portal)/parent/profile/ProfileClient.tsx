'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BellRing, BellOff, CheckCircle2, Shield, 
  CreditCard, LogOut, ChevronRight, User as UserIcon 
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { createClient } from '@/utils/supabase/client';

type UserProfile = {
  id: string;
  full_name?: string;
  email?: string;
};

type Props = {
  userProfile: UserProfile | null;
  userEmail: string;
};

export default function ProfileClient({ userProfile, userEmail }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const { isSubscribed, isLoading, subscribeToNotifications } = usePushNotifications();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const fullName = userProfile?.full_name || 'Usuario';
  const initial = fullName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── Encabezado ── */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-[#004B87] tracking-tight">Centro de Configuración</h1>
        <p className="text-[#8aa8cc] font-medium mt-1">Gestiona tus preferencias, notificaciones y cuenta.</p>
      </div>

      {/* ── 1. Tarjeta de Notificaciones Push ── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#e8f0f7] shadow-sm relative overflow-hidden">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-[#f0f5fb] rounded-full opacity-50 blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${isSubscribed ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              {isSubscribed ? (
                <BellRing className="h-7 w-7 text-emerald-500" />
              ) : (
                <BellOff className="h-7 w-7 text-amber-500" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-black text-[#004B87]">Motor de Notificaciones</h2>
              <p className="text-sm font-medium text-[#8aa8cc] mt-1 max-w-sm">
                Recibe alertas en tiempo real sobre las compras y movimientos de tus hijos.
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto">
            {isSubscribed ? (
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-5 py-3.5 rounded-2xl border border-emerald-100 w-full justify-center">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-black text-sm uppercase tracking-widest">Alertas activadas</span>
              </div>
            ) : (
              <button
                onClick={subscribeToNotifications}
                disabled={isLoading}
                className="w-full md:w-auto group relative bg-gradient-to-r from-[#F4C430] to-[#f5d05d] hover:from-[#e6b110] hover:to-[#eec537] text-[#1a3a5c] px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden"
              >
                {isLoading ? 'Activando...' : 'Activar Alertas de Compra'}
                {/* Brillo del botón */}
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 2. Información del Perfil ── */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#e8f0f7] shadow-sm flex items-center gap-6">
        <div className="h-20 w-20 md:h-24 md:w-24 bg-gradient-to-br from-[#7CB9E8] to-[#004B87] rounded-[2rem] flex items-center justify-center shadow-inner shrink-0 text-white font-black text-3xl md:text-4xl uppercase">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#8aa8cc] text-[10px] font-black uppercase tracking-widest mb-1">Información Personal</p>
          <h2 className="text-2xl md:text-3xl font-black text-[#004B87] truncate">{fullName}</h2>
          <p className="text-slate-500 font-medium text-sm md:text-base mt-1 truncate">{userEmail}</p>
        </div>
        <button className="hidden sm:flex h-12 w-12 bg-[#f0f5fb] rounded-full items-center justify-center text-[#7CB9E8] hover:bg-[#e8f0f7] hover:text-[#004B87] transition active:scale-95 shrink-0" title="Editar Perfil">
          <UserIcon className="h-5 w-5" />
        </button>
      </div>

      {/* ── 3. Secciones de Configuración ── */}
      <div className="bg-white rounded-3xl border border-[#e8f0f7] shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-[#f0f5fb]">
          <h3 className="font-black text-[#004B87] text-lg">Ajustes de la Cuenta</h3>
        </div>
        
        <div className="divide-y divide-[#f0f5fb]">
          {/* Seguridad */}
          <button className="w-full flex items-center justify-between p-6 hover:bg-[#f8fafd] transition-colors group">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-left">
                <p className="font-black text-[#004B87] text-base">Seguridad</p>
                <p className="text-[#8aa8cc] text-xs font-semibold mt-0.5">Cambiar contraseña</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[#b0c8e0] group-hover:text-[#004B87] transition-colors group-hover:translate-x-1" />
          </button>

          {/* Métodos de Pago */}
          <button className="w-full flex items-center justify-between p-6 hover:bg-[#f8fafd] transition-colors group">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-left">
                <p className="font-black text-[#004B87] text-base">Métodos de Pago</p>
                <p className="text-[#8aa8cc] text-xs font-semibold mt-0.5">Gestionar tarjetas vinculadas</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[#b0c8e0] group-hover:text-[#004B87] transition-colors group-hover:translate-x-1" />
          </button>
        </div>
      </div>

      {/* ── 4. Cerrar Sesión ── */}
      <div className="pt-4">
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full bg-white hover:bg-red-50 border border-red-100 text-red-500 hover:text-red-600 font-black px-6 py-4 rounded-2xl flex items-center justify-center gap-3 transition-colors active:scale-95 disabled:opacity-50 uppercase tracking-widest text-sm"
        >
          <LogOut className="h-5 w-5" />
          {isSigningOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
        </button>
      </div>

    </div>
  );
}
