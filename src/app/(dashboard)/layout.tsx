import { createClient, createAdminClient } from '@/utils/supabase/server';
import SchoolSidebar from '@/components/school/SchoolSidebar';
import MasterSidebar from '@/components/master/MasterSidebar';
import { headers } from 'next/headers';

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
  }

  const isMaster = role === 'superadmin';
  const schoolName = school?.name || 'Escuela';
  const schoolInitials = schoolName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  if (isMaster) {
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
      <SchoolSidebar schoolName={schoolName} />
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-[#e8f0f7] px-8 py-4 flex justify-end items-center sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[#2b5fa6] font-black text-sm leading-none">{schoolName}</p>
              <p className="text-[#8aa8cc] text-xs font-semibold mt-0.5 uppercase tracking-wide">SEDE CENTRAL</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-[#f4c430] flex items-center justify-center text-[#2b5fa6] font-black text-sm shadow-sm border-2 border-white ring-2 ring-[#2b5fa6]">
              {schoolInitials}
            </div>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
