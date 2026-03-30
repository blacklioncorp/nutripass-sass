import { Calendar, Users, Bell, Settings, Utensils } from 'lucide-react';
import BottomNav from '@/components/portal/BottomNav';

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
            <div className="bg-blue-100 text-[#3b82f6] h-10 w-10 rounded-xl flex items-center justify-center shadow-sm border border-blue-200">
              <Utensils className="h-5 w-5" />
            </div>
            <h2 className="text-[#004B87] text-xl font-black tracking-tight">NutriPass <span className="text-slate-400 font-medium">Padres</span></h2>
          </div>
          <div className="hidden md:flex gap-10 items-center text-[#004B87] font-black text-sm uppercase tracking-widest">
            <a href="/parent/preorders" className="hover:text-[#3b82f6] transition-all flex items-center gap-2.5 group">
              <div className="h-9 w-9 bg-slate-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center transition-colors">
                <Calendar className="h-4 w-4 stroke-[2.5px]" />
              </div>
              Reserva Semanal
            </a>
            <a href="/parent" className="hover:text-[#3b82f6] transition-all flex items-center gap-2.5 group">
              <div className="h-9 w-9 bg-slate-50 group-hover:bg-blue-50 rounded-xl flex items-center justify-center transition-colors">
                <Users className="h-4 w-4 stroke-[2.5px]" />
              </div>
              Mis Hijos
            </a>
            <div className="flex items-center gap-2 border-l border-slate-100 pl-8 ml-2">
              <button className="h-10 w-10 bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 rounded-full transition-all flex items-center justify-center relative group" title="Notificaciones">
                <Bell className="h-5 w-5 text-[#004B87] group-hover:scale-110 transition-transform" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white shadow-sm" />
              </button>
              <button className="h-10 w-10 bg-white border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 rounded-full transition-all flex items-center justify-center group" title="Configuración">
                <Settings className="h-5 w-5 text-[#004B87] group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-10 max-w-6xl mx-auto w-full pt-8 pb-32 md:pb-10">
        {children}
      </main>

      {/* Floating Premium Bottom Nav (Mobile Only) */}
      <BottomNav />
    </div>
  );
}
