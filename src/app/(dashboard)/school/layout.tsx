import { createClient, createAdminClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // 1. Fetch exact role for this user
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'staff';
  const isStaff = role === 'staff';

  // 2. Resolve current path to determine if redirection is needed
  const headersList = await headers();
  const fullPath = headersList.get('x-pathname') || '/school';

  if (isStaff) {
    const restrictedPaths = ['/school', '/school/settings'];
    const isAtRestricted = restrictedPaths.some(p => fullPath === p || fullPath.startsWith(p + '/'));
    
    // Note: If staff is at root /school, move them to /point-of-sale
    if (fullPath === '/school' || fullPath === '/school/settings') {
       redirect('/point-of-sale');
    }
  }

  return <>{children}</>;
}
