
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  CreditCard,
  Settings,
  LogOut,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Vista Global', href: '/super-admin', icon: LayoutDashboard },
    { name: 'Gestión de Escuelas', href: '/super-admin/schools', icon: Building2 },
    { name: 'Usuarios Globales', href: '/super-admin/users', icon: Users },
    { name: 'Finanzas & Billing', href: '/super-admin/billing', icon: CreditCard },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar Maestro */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col hidden md:flex">
        <div className="p-8 border-b border-slate-800">
          <Link href="/super-admin" className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl shadow-lg shadow-primary/20">
              <ShieldCheck className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <span className="text-xl font-black block tracking-tighter">NUTRIPASS</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Master Control</span>
            </div>
          </Link>
        </div>
        
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-bold transition-all group",
                  isActive 
                    ? "bg-primary text-foreground shadow-lg shadow-primary/10" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-foreground" : "text-slate-500 group-hover:text-white")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-800 space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Estado del Sistema</p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-emerald-500">Todos los servicios online</span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-3 font-bold text-slate-400 hover:text-white hover:bg-red-500/10 hover:text-red-400">
            <LogOut className="h-5 w-5" />
            Cerrar Sesión Master
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b flex items-center justify-between px-10 shrink-0">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-slate-400" />
            <h2 className="text-sm font-black uppercase text-slate-400 tracking-widest">
              {navItems.find(item => item.href === pathname)?.name || 'Administración Global'}
            </h2>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-slate-900">Admin Central</p>
              <p className="text-[10px] font-bold text-primary uppercase">Root Access</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center font-black text-primary shadow-xl border-2 border-slate-800">
              NP
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-10 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
