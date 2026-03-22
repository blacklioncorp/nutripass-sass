
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  LayoutDashboard, 
  Utensils, 
  Settings, 
  CreditCard,
  LogOut,
  ShoppingBag,
  Calendar,
  ChefHat,
  Palette,
  Barcode
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Gestión Usuarios', href: '/admin/members', icon: Users },
    { name: 'Catálogo Productos', href: '/admin/products', icon: ShoppingBag },
    { name: 'Control Inventario', href: '/admin/inventory', icon: Barcode },
    { name: 'Planificador Menú', href: '/admin/menu', icon: Calendar },
    { name: 'Reporte Cocina', href: '/admin/kitchen', icon: ChefHat },
    { name: 'Personalización', href: '/admin/settings/branding', icon: Palette },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-64 bg-white border-r shadow-sm flex flex-col hidden md:flex">
        <div className="p-6 border-b">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg shadow-md">
              <Utensils className="h-6 w-6 text-foreground" />
            </div>
            <span className="text-xl font-black text-foreground">NutriPass</span>
          </Link>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2">Panel Administrador</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all",
                  isActive 
                    ? "bg-primary text-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-foreground" : "text-muted-foreground")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 font-bold text-muted-foreground hover:text-foreground">
            <Settings className="h-5 w-5" />
            Configuración
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-3 font-bold text-destructive hover:bg-destructive/10">
            <LogOut className="h-5 w-5" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-black uppercase text-muted-foreground">
            {navItems.find(item => item.href === pathname)?.name || 'Administración'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-black text-foreground">Escuela San Agustín</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Sede Central</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-black text-foreground shadow-inner">
              SA
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
