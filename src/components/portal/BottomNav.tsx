'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Receipt, User, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { label: 'Inicio', href: '/parent', icon: Home },
    { label: 'Pedidos', href: '/parent/preorders', icon: Receipt },
    { label: 'Avisos', href: '/parent/notificaciones', icon: Bell },
    { label: 'Perfil', href: '#settings', icon: User },
  ];

  if (!mounted) return null;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-[100] md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center px-1 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (pathname?.startsWith(`${item.href}/`) && item.href !== '/');

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-3 space-y-1 transition-all duration-200 active:scale-95",
                isActive ? "text-[#10b981]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon 
                className={cn(
                  "h-6 w-6 transition-transform duration-200", 
                  isActive ? "scale-110 stroke-[2.5px]" : "stroke-[2px]"
                )} 
              />
              <span className={cn(
                "text-[10px] tracking-tight transition-all",
                isActive ? "font-black" : "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
