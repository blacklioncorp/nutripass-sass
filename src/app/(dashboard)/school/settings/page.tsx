import BrandSettingsForm from '@/components/admin/BrandSettingsForm';
import OperationalSettingsForm from '@/components/admin/OperationalSettingsForm';
import { createAdminClient } from '@/utils/supabase/server';
import { getEffectiveSchoolId } from '@/utils/auth/effective-school';
import { Settings, Sliders, Palette } from 'lucide-react';

export default async function SchoolSettingsPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const schoolId = await getEffectiveSchoolId();
  const adminClient = await createAdminClient();
  
  const { data: school } = await adminClient
    .from('schools')
    .select('billing_email, opening_time, closing_time')
    .eq('id', schoolId)
    .single();

  const activeTab = searchParams.tab || 'brand';

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Header with Icon */}
      <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="h-14 w-14 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center">
            <Settings className="h-7 w-7 text-[#2b5fa6]" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-[#1a3a5c] tracking-tight">Configuración del Sistema</h1>
          <p className="text-[#8aa8cc] font-medium text-sm mt-1 uppercase tracking-widest leading-none">Gestión Institucional NutriPass</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex overflow-hidden bg-white/40 backdrop-blur-md p-1.5 rounded-[2rem] border border-white/60 shadow-xl shadow-blue-900/5 w-fit animate-in fade-in zoom-in-95 duration-500">
          <a 
            href="?tab=brand"
            className={`flex items-center gap-2 px-8 py-4 rounded-3xl font-black text-sm tracking-tight transition-all ${
              activeTab === 'brand' 
              ? 'bg-[#1a3a5c] text-white shadow-lg active:scale-95' 
              : 'text-[#8aa8cc] hover:text-[#1a3a5c] hover:bg-white/60'
            }`}
          >
            <Palette className={`h-4 w-4 ${activeTab === 'brand' ? 'text-[#7CB9E8]' : ''}`} />
            🎨 Personalización de Marca
          </a>
          <a 
            href="?tab=operation"
            className={`flex items-center gap-2 px-8 py-4 rounded-3xl font-black text-sm tracking-tight transition-all ${
              activeTab === 'operation' 
              ? 'bg-[#1a3a5c] text-white shadow-lg active:scale-95' 
              : 'text-[#8aa8cc] hover:text-[#1a3a5c] hover:bg-white/60'
            }`}
          >
            <Sliders className={`h-4 w-4 ${activeTab === 'operation' ? 'text-[#7CB9E8]' : ''}`} />
            ⚙️ Operación y Finanzas
          </a>
      </div>

      {/* Content Area */}
      <div className="relative group">
        {activeTab === 'brand' ? (
          <div className="bg-white p-10 rounded-[3rem] border border-[#e8f0f7] shadow-sm animate-in fade-in zoom-in-95 duration-500">
             <div className="mb-10 max-w-xl">
                <h2 className="text-2xl font-black text-[#1a3a5c] tracking-tight mb-2 uppercase italic">Identidad Visual (White-Label)</h2>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  Personaliza la apariencia de tu portal NutriPass subiendo el escudo de tu colegio y ajustando los **colores institucionales** para una experiencia 100% nativa.
                </p>
             </div>
             <BrandSettingsForm />
          </div>
        ) : (
          <OperationalSettingsForm initialData={school || { billing_email: '', opening_time: '', closing_time: '' }} />
        )}
      </div>
    </div>
  );
}
