'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Dashboard', href: '/school', icon: '⊞' },
  { label: 'Gestión Usuarios', href: '/school/consumers', icon: '👤' },
  { label: 'Catálogo Productos', href: '/school/products', icon: '📦' },
  { label: 'Control Inventario', href: '/school/inventory', icon: '📊' },
  { label: 'Planificador Menú', href: '/school/menu', icon: '🍽️' },
  { label: 'Reporte Cocina', href: '/school/kitchen', icon: '🧑‍🍳' },
  { label: 'Personalización', href: '/school/settings', icon: '🎨' },
];

export default function SchoolSidebar({ schoolName }: { schoolName?: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-60 bg-white border-r border-[#e8f0f7] flex-shrink-0 flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-[#e8f0f7]">
        <div className="flex items-center gap-3">
          <div className="bg-[#e8f0f7] text-[#2b5fa6] h-10 w-10 rounded-xl flex items-center justify-center text-xl font-black shadow-sm">
            N
          </div>
          <div>
            <h2 className="text-[#2b5fa6] text-lg font-black tracking-tight leading-none">NutriPass</h2>
            <p className="text-[#8aa8cc] text-[10px] font-bold uppercase tracking-widest mt-0.5">Panel Administrador</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/school' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm group ${
                isActive
                  ? 'bg-[#2b5fa6] text-white shadow-md'
                  : 'text-[#4a6fa5] hover:bg-[#e8f0f7] hover:text-[#2b5fa6]'
              }`}
            >
              <span className={`text-base transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-[#8aa8cc]'}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Links */}
      <div className="p-4 border-t border-[#e8f0f7] space-y-1">
        <Link
          href="/school/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#4a6fa5] hover:bg-[#e8f0f7] hover:text-[#2b5fa6] transition-all duration-200 font-semibold text-sm"
        >
          <span className="text-[#8aa8cc]">⚙️</span>
          Configuración
        </Link>
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#e05555] hover:bg-red-50 transition-all duration-200 font-semibold text-sm"
          >
            <span>↩</span>
            Cerrar Sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
