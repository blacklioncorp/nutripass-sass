import { Calendar, Users, Bell, Settings, Utensils } from 'lucide-react';
import BottomNav from '@/components/portal/BottomNav';
import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let schoolBranding = null;
  if (user) {
    // Fetch the school data of the first linked child
    const { data: consumer } = await supabase
      .from('consumers')
      .select('schools(name, logo_url, primary_color)')
      .eq('parent_id', user.id)
      .limit(1)
      .single();
      
    if (consumer && consumer.schools) {
      schoolBranding = consumer.schools as any;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-blue-50 p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center w-full">
          
          <Link href="/parent" className="flex items-center gap-3 transition-transform hover:opacity-90 active:scale-95 bg-slate-50/50 hover:bg-slate-100 p-2 rounded-2xl border border-slate-100 shadow-sm">
            {schoolBranding?.logo_url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={schoolBranding.logo_url} 
                  alt="Colegio" 
                  className="h-8 md:h-10 w-auto object-contain drop-shadow-sm rounded-full" 
                />
                <div className="border-l border-slate-300 h-6 opacity-60"></div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="https://juautqvqptburnflbolm.supabase.co/storage/v1/object/public/school_assets/SafeLunch.png" 
                  alt="Logo de SafeLunch" 
                  className="h-5 md:h-6 w-auto object-contain drop-shadow-sm opacity-90" 
                />
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src="https://juautqvqptburnflbolm.supabase.co/storage/v1/object/public/school_assets/SafeLunch.png" 
                alt="Logo de SafeLunch" 
                className="h-8 md:h-10 w-auto object-contain drop-shadow-sm" 
              />
            )}
            
            {schoolBranding?.name && (
              <div className="hidden sm:block border-l border-slate-200 pl-3 ml-1">
                 <h2 className="text-[#004B87] text-sm font-black tracking-tight leading-none">
                   Cafetería <br/>
                   <span className="text-slate-500 font-medium text-xs">{schoolBranding.name}</span>
                 </h2>
              </div>
            )}
          </Link>
          
          <div className="hidden md:flex gap-10 items-center text-[#004B87] font-black text-sm uppercase tracking-widest">
            <Link href="/parent/preorders" className="hover:text-[#10b981] transition-all flex items-center gap-2.5 group">
              <div className="h-9 w-9 bg-slate-50 group-hover:bg-emerald-50 rounded-xl flex items-center justify-center transition-colors">
                <Calendar className="h-4 w-4 stroke-[2.5px]" />
              </div>
              Pedidos
            </Link>
            <Link href="/parent" className="hover:text-[#10b981] transition-all flex items-center gap-2.5 group">
              <div className="h-9 w-9 bg-slate-50 group-hover:bg-emerald-50 rounded-xl flex items-center justify-center transition-colors">
                <Users className="h-4 w-4 stroke-[2.5px]" />
              </div>
              Hijos
            </Link>
            <div className="flex items-center gap-2 border-l border-slate-100 pl-8 ml-2">
              <button className="h-10 w-10 bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 rounded-full transition-all flex items-center justify-center relative group" title="Notificaciones">
                <Bell className="h-5 w-5 text-[#004B87] group-hover:scale-110 transition-transform" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white shadow-sm" />
              </button>
              <button className="h-10 w-10 bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 rounded-full transition-all flex items-center justify-center group" title="Configuración">
                <Settings className="h-5 w-5 text-[#004B87] group-hover:rotate-90 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-10 max-w-6xl mx-auto w-full pt-8 pb-28 md:pb-10">
        {children}
      </main>

      {/* Floating Premium Bottom Nav (Mobile Only) */}
      <BottomNav />
    </div>
  );
}
