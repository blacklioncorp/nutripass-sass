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

// Routes that don't require a tenant (superadmin, parent portal, auth)
const TENANT_FREE_PREFIXES = ['/master', '/parent', '/login', '/'];

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [tenant, setTenant] = useState<SchoolTenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Reset tenant on every route change to prevent bleed-over between schools
    setTenant(null);
    setIsLoading(true);

    // Clear CSS branding variables back to safe NutriPass defaults
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', '#7CB9E8');
    root.style.setProperty('--brand-secondary', '#004B87');

    // Routes that don't need tenant resolution
    const isTenantFree = TENANT_FREE_PREFIXES.some(p =>
      p === '/' ? pathname === '/' : pathname.startsWith(p)
    );
    if (isTenantFree) {
      setIsLoading(false);
      return;
    }

    const fetchTenantForUser = async () => {
      try {
        // Step 1: Get the authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setIsLoading(false); return; }

        // Step 2: Get their profile to find school_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('school_id, role')
          .eq('id', user.id)
          .single();

        if (!profile?.school_id) {
          // Superadmin with no school: skip tenant loading
          setIsLoading(false);
          return;
        }

        // Step 3: Fetch the school by the user's OWN school_id (strict isolation)
        const { data: school, error } = await supabase
          .from('schools')
          .select('id, name, subdomain, logo_url, primary_color, secondary_color')
          .eq('id', profile.school_id)
          .single();

        if (school && !error) {
          setTenant(school as SchoolTenant);
        }
      } catch (err) {
        console.error('TenantProvider error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantForUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Apply branding CSS variables whenever the tenant changes
  useEffect(() => {
    if (!tenant) return;
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', tenant.primary_color || '#7CB9E8');
    root.style.setProperty('--brand-secondary', tenant.secondary_color || '#004B87');
  }, [tenant]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Cargando Portal...</h2>
      </div>
    );
  }

  return (
    <TenantContext.Provider value={{ tenant, isLoading }}>
      {children}
    </TenantContext.Provider>
  );
}
