import { createAdminClient } from '@/utils/supabase/server';
import { getEffectiveSchoolId } from '@/utils/auth/effective-school';
import { UserPlus, Settings, Users2, ShieldCheck } from 'lucide-react';
import StaffList from '@/components/school/StaffList';
import StaffModalOpener from '@/components/school/StaffModalOpener';

export default async function SchoolStaffPage() {
  const schoolId = await getEffectiveSchoolId();
  const adminClient = await createAdminClient();

  // Fetch all profiles for this school
  const { data: staff, error } = await adminClient
    .from('profiles')
    .select('id, full_name, role, updated_at')
    .eq('school_id', schoolId)
    .order('full_name', { ascending: true });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <p className="text-2xl font-black text-red-500 mb-2 font-black italic tracking-tighter">Error al Cargar Personal</p>
        <p className="text-slate-400 font-medium">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {/* Header with Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-5">
            <div className="h-14 w-14 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center">
                <Users2 className="h-7 w-7 text-[#2b5fa6]" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-[#1a3a5c] tracking-tight italic">Gestión de Personal</h1>
              <div className="flex items-center gap-2 mt-1">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest leading-none">Control de Acceso Institucional</p>
              </div>
            </div>
        </div>
        
        <StaffModalOpener />
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-br from-[#1a3a5c] to-[#0d1f3c] p-10 rounded-[3rem] shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
         <div className="absolute -right-20 -top-20 h-64 w-64 bg-white/5 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-1000" />
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="max-w-xl">
               <h3 className="text-white text-2xl font-black mb-3 tracking-tight italic uppercase">Directorio de Colaboradores</h3>
               <p className="text-blue-100/70 font-medium text-sm leading-relaxed">
                  Administra las cuentas de acceso de tu equipo de cocina y caja. <br/>Recuerda que solo los **Administradores** pueden ver estados financieros y configurar la marca.
               </p>
            </div>
            <div className="flex gap-4">
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 text-center">
                    <p className="text-white text-2xl font-black leading-none">{staff?.length || 0}</p>
                    <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mt-1">Total</p>
                </div>
                <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 text-center">
                    <p className="text-white text-2xl font-black leading-none">
                        {staff?.filter(s => s.role === 'school_admin').length || 0}
                    </p>
                    <p className="text-blue-200 text-[10px] font-bold uppercase tracking-widest mt-1">Admins</p>
                </div>
            </div>
         </div>
      </div>

      {/* Table Section */}
      <StaffList staff={staff || []} />
    </div>
  );
}
