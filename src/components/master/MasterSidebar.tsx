'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/master', icon: '⊞' },
  { label: 'Colegios', href: '/master', icon: '🏫' },
  { label: 'Configuración', href: '/master', icon: '⚙️' },
];

export default function MasterSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-60 bg-[#0d1f3c] flex-shrink-0 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-[#f4c430] text-[#0d1f3c] h-10 w-10 rounded-xl flex items-center justify-center text-base font-black shadow-sm">
            N
          </div>
          <div>
            <h2 className="text-white text-lg font-black tracking-tight leading-none">NutriPass</h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">Panel Administrador</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/master' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm group ${
                isActive
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className={`text-base transition-transform group-hover:scale-110 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-white/10">
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/20 transition-all duration-200 font-semibold text-sm"
          >
            <span>↩</span>
            Cerrar Sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
