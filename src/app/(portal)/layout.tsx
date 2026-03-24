export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b border-blue-50 p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-[#3b82f6] h-10 w-10 rounded-xl flex items-center justify-center text-xl shadow-sm border border-blue-200">
              🍽️
            </div>
            <h2 className="text-[#004B87] text-xl font-black tracking-tight">NutriPass <span className="text-slate-400 font-medium">Padres</span></h2>
          </div>
          <div className="hidden md:flex gap-8 items-center text-[#004B87] font-bold text-sm">
            <a href="/parent/preorders" className="hover:text-[#3b82f6] transition flex items-center gap-1.5">
              <span className="text-base">🗓️</span> Reserva Semanal
            </a>
            <a href="/parent" className="hover:text-[#3b82f6] transition">Mis Hijos</a>
            <button className="hover:bg-[#e8f0f7] p-2.5 rounded-full transition" title="Notificaciones">
              <span className="text-lg">🔔</span>
            </button>
            <button className="hover:bg-[#e8f0f7] p-2.5 rounded-full transition" title="Configuración">
              <span className="text-lg">⚙️</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full pt-8">
        {children}
      </main>
    </div>
  );
}
