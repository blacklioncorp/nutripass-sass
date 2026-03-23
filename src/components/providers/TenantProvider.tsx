'use client';

import React, { useEffect, useState, createContext, useContext } from 'react';
import { createClient } from '@/utils/supabase/client';
import { usePathname } from 'next/navigation';

export interface SchoolTenant {
  id: string;
  name: string;
  subdomain: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

interface TenantContextType {
  tenant: SchoolTenant | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType>({ tenant: null, isLoading: true });

export const useTenant = () => useContext(TenantContext);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tenant, setTenant] = useState<SchoolTenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchTenant = async () => {
      const hostname = window.location.hostname;
      const subdomain = hostname.split('.')[0];
      
      const isLocal = hostname === 'localhost' || hostname.includes('127.0.0.1');
      const isRootVercel = hostname === 'nutripass-sass.vercel.app';
      
      // Map local test or root vercel domain to an existing school ('sakbe') instead of 'demo'
      const targetSubdomain = isLocal || isRootVercel ? 'sakbe' : subdomain;

      try {
        const { data, error } = await supabase
          .from('schools')
          .select('*')
          .eq('subdomain', targetSubdomain)
          .single();

        if (data && !error) {
          setTenant(data as SchoolTenant);
        }
      } catch (err) {
        console.error("Error fetching tenant:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenant();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tenant) {
      const root = document.documentElement;
      if (tenant.primary_color) root.style.setProperty('--brand-primary', tenant.primary_color);
      if (tenant.secondary_color) root.style.setProperty('--brand-secondary', tenant.secondary_color);
    }
  }, [tenant]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Identificando Institución...</h2>
      </div>
    );
  }

  if (!tenant) {
    // Bypass strict tenant matching for administrative or root routes
    if (pathname.startsWith('/master') || pathname.startsWith('/parent') || pathname === '/login' || pathname === '/') {
       return (
         <TenantContext.Provider value={{ tenant: null, isLoading: false }}>
           {children}
         </TenantContext.Provider>
       );
    }


    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-100 p-6 rounded-3xl mb-6 shadow-sm border border-red-200">
          <span className="text-5xl">🏫</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-2">Escuela No Encontrada</h1>
        <p className="text-slate-500 font-medium mb-8 max-w-md">La dirección a la que intentas acceder no está registrada en NutriPass o el subdominio es incorrecto.</p>
        <button onClick={() => window.location.href = '/login'} className="bg-blue-600 text-white font-bold px-8 py-4 rounded-2xl shadow hover:bg-blue-700 transition">
          IR AL PANEL GLOBAL DE ADMINISTRACIÓN
        </button>
      </div>
    );
  }

  return (
    <TenantContext.Provider value={{ tenant, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}
