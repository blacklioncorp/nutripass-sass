'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Users, Bell, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // Fix hydration mismatch for active states
  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) return null;

  return (
    <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-lg md:hidden z-[100] animate-in slide-in-from-bottom-10 duration-700 ease-out">
      <div className="bg-white/80 backdrop-blur-lg border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-full p-2 flex justify-around items-center ring-1 ring-white/10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center p-3 transition-all duration-500 active:scale-95 group",
                isActive ? "text-[#004B87]" : "text-slate-400 hover:text-[#7CB9E8]"
              )}
            >
              <div className={cn(
                "p-2.5 rounded-full transition-all duration-500",
                isActive 
                  ? "bg-[#004B87] text-white shadow-lg shadow-[#004B87]/30 scale-110" 
                  : "bg-transparent group-hover:bg-[#e8f0f7]/50"
              )}>
                <Icon className={cn("h-6 w-6", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
              </div>
              
              <span className={cn(
                "text-[9px] font-black uppercase tracking-tighter mt-1 transition-all duration-500",
                isActive ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
              )}>
                {item.label}
              </span>

              {item.hasBadge && (
                <span className={cn(
                  "absolute top-3 right-3 h-2.5 w-2.5 rounded-full border-2 border-white/50 animate-pulse shadow-sm",
                  isActive ? "bg-red-400" : "bg-red-500"
                )} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
