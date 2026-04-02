'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Users, Bell, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Reserva',
      href: '/parent/preorders',
      icon: Calendar,
    },
    {
      label: 'Mis Hijos',
      href: '/parent',
      icon: Users,
    },
    {
      label: 'Notificaciones',
      href: '/parent/notificaciones',
      icon: Bell,
      hasBadge: true,
    },
    {
      label: 'Ajustes',
      href: '#settings',
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md md:hidden z-[100] animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white/70 backdrop-blur-xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[2.5rem] p-3 flex justify-around items-center ring-1 ring-black/[0.05]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 p-2 transition-all duration-300 active:scale-90",
                isActive ? "text-[#004B87]" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all duration-300",
                isActive ? "bg-[#e8f0f7] shadow-inner" : "bg-transparent"
              )}>
                <Icon className={cn("h-6 w-6", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
              </div>
              
              <span className={cn(
                "text-[10px] font-black uppercase tracking-tighter transition-opacity duration-300",
                isActive ? "opacity-100" : "opacity-60"
              )}>
                {item.label}
              </span>

              {item.hasBadge && (
                <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse shadow-sm" />
              )}

              {isActive && (
                <div className="absolute -bottom-1 h-1 w-1 bg-[#004B87] rounded-full shadow-[0_0_8px_rgba(0,75,135,0.5)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
