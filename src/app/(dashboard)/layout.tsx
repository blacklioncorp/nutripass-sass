import { createClient, createAdminClient } from '@/utils/supabase/server';
import SchoolSidebar from '@/components/school/SchoolSidebar';
import MasterSidebar from '@/components/master/MasterSidebar';
import { headers, cookies } from 'next/headers';
import { stopImpersonation } from './master/actions';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let school = null;
  let role = 'school_admin';

  if (user) {
    // We use the admin client here to reliably get the role and school, 
    // bypassing any RLS issues that might occur during layout initialization.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*, schools(*)')
      .eq('id', user.id)
      .single();
      
    if (profile) {
      school = (profile as any).schools;
      role = (profile as any).role || 'school_admin';
    }

    // --- Impersonation Logic for Superadmins ---
    if (role === 'superadmin') {
      const cookieStore = await cookies();
      const impersonatedId = cookieStore.get('impersonated_school_id')?.value;
      
      if (impersonatedId) {
        const { data: impSchool } = await supabaseAdmin
          .from('schools')
          .select('*')
          .eq('id', impersonatedId)
          .single();
        
        if (impSchool) {
          school = impSchool;
          // Note: role remains superadmin but UI will show the impersonated school
        }
      }
    }
  }

  const isMaster = role === 'superadmin';
  const cookieStore = await cookies();
  const impersonatedId = cookieStore.get('impersonated_school_id')?.value;
  const showSchoolLayout = (!isMaster) || (isMaster && !!impersonatedId);

  const schoolName = school?.name || (isMaster ? 'Panel Maestro' : 'Escuela');
  
  // Dynamic Universal Avatar Logic
  const encodedName = encodeURIComponent(schoolName);
  const dynamicAvatarUrl = `https://ui-avatars.com/api/?name=${encodedName}&background=f4c430&color=2b5fa6&rounded=true&bold=true`;
  const topLogo = school?.logo_url || dynamicAvatarUrl;

  if (isMaster && !impersonatedId) {
    return (
      <div className="min-h-screen bg-[#f0f5fb] flex flex-col md:flex-row">
        <MasterSidebar />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f5fb] flex flex-col md:flex-row">
      <SchoolSidebar schoolName={schoolName} role={role} schoolLogo={topLogo} />
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-[#e8f0f7] px-8 py-4 flex justify-between items-center sticky top-0 z-40">
          <div>
            {isMaster && (await cookies()).get('impersonated_school_id') && (
              <form action={stopImpersonation}>
                <button 
                  type="submit"
                  className="bg-amber-100 text-amber-700 text-xs font-black px-4 py-2 rounded-full border border-amber-200 hover:bg-amber-200 transition"
                >
                  ⚠️ MODO IMPERSONACIÓN • SALIR
                </button>
              </form>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[#2b5fa6] font-black text-sm leading-none">{schoolName}</p>
              <p className="text-[#8aa8cc] text-xs font-semibold mt-0.5 uppercase tracking-wide">SEDE CENTRAL</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={topLogo}
              alt={schoolName}
              className="h-10 w-10 rounded-full object-cover shadow-sm border-2 border-white ring-2 ring-[#2b5fa6]" 
            />
          </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
