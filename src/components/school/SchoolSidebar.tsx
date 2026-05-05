'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePendingOrders } from '@/hooks/usePendingOrders';


const navItems = [
  { label: 'Dashboard', href: '/school', icon: '⊞' },
  { label: 'Gestión Usuarios', href: '/school/consumers', icon: '👤' },
  { label: 'Gestión Personal', href: '/school/staff', icon: '👥' },
  { label: 'Catálogo Productos', href: '/school/products', icon: '📦' },
  { label: 'Control Inventario', href: '/school/inventory', icon: '📊' },
  { label: 'Planificador Menú', href: '/school/menu', icon: '🍽️' },
  { label: 'Reporte Cocina', href: '/school/kitchen', icon: '🧑‍🍳' },
  { label: 'Checklist Cafetería', href: '/school/checklist', icon: '📋' },
  { label: 'Caja POS (Cafetería)', href: '/point-of-sale', icon: '💳' },
  { label: 'Personalización', href: '/school/settings', icon: '🎨' },
];

export default function SchoolSidebar({ 
  schoolName, 
  role,
  schoolLogo
}: { 
  schoolName?: string; 
  role?: string;
  schoolLogo?: string;
}) {
  const pathname = usePathname();
  const isStaff = role === 'staff';
  const pendingCount = usePendingOrders();

  const filteredItems = navItems.filter(item => {
    if (isStaff) {
      // El staff ahora tiene acceso a: POS, Menú, Cocina y Checklist
      const allowedPaths = [
        '/point-of-sale',
        '/school/menu',
        '/school/kitchen',
        '/school/checklist'
      ];
      return allowedPaths.includes(item.href);
    }
    return true;
  });


  return (
    <aside className="w-full md:w-60 bg-white border-r border-[#e8f0f7] flex-shrink-0 flex flex-col min-h-screen">
      {/* Co-Branding Header (Alianza) */}
      <div className="p-5 border-b border-[#e8f0f7] bg-slate-900">
        {/* Contenedor Unificado (Badge Claro) */}
        <div className="bg-[#F8FAF6] rounded-2xl p-3 flex items-center justify-center gap-4 shadow-sm border border-slate-200/50">
          
          {/* Izquierda: La Institución (Colegio) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={schoolLogo} 
            alt={schoolName || "Colegio Americano"} 
            className="h-10 w-auto object-contain drop-shadow-sm rounded-full" 
          />

          {/* Centro: Separador Sutil */}
          <div className="border-l border-slate-300 h-8 opacity-60"></div>

          {/* Derecha: La Plataforma (NutriPass) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://juautqvqptburnflbolm.supabase.co/storage/v1/object/public/school_assets/safelunchupgrade.PNG" 
            alt="Logo de SafeLunch" 
            className="h-7 w-auto object-contain drop-shadow-sm transition-all hover:scale-105" 
          />
        </div>

        {/* Contexto Inferior */}
        <div className="text-center mt-3">
          <p className="text-white/80 text-[10px] font-semibold tracking-wider uppercase">
            Plataforma de Nutrición Escolar
          </p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map((item) => {
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
              <div className="relative">
                <span className={`text-base transition-transform group-hover:scale-110 flex items-center justify-center ${isActive ? 'text-white' : 'text-[#8aa8cc]'}`}>
                  {item.icon}
                </span>
                {item.label === 'Reporte Cocina' && pendingCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center justify-center min-w-[18px] h-[18px] border-2 border-white md:border-none shadow-sm">
                    {pendingCount}
                  </span>
                )}
              </div>
              {item.label}
            </Link>

          );
        })}
      </nav>

      {/* Bottom Links */}
      <div className="p-4 border-t border-[#e8f0f7] space-y-1">
        {!isStaff && (
          <Link
            href="/school/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#4a6fa5] hover:bg-[#e8f0f7] hover:text-[#2b5fa6] transition-all duration-200 font-semibold text-sm"
          >
            <span className="text-[#8aa8cc]">⚙️</span>
            Configuración
          </Link>
        )}
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
