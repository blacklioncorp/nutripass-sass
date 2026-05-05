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
    // Whitelist de rutas permitidas para staff
    const allowedPaths = [
      '/point-of-sale',
      '/school/kitchen',
      '/school/menu',
      '/school/checklist'
    ];
    
    // Verificamos si la ruta actual está permitida
    const isAllowed = allowedPaths.some(p => 
      fullPath === p || fullPath.startsWith(p + '/')
    );

    // Si intenta acceder a una ruta no permitida (como Dashboard BI o Configuración),
    // lo redirigimos al POS, pero solo si no está ya en una ruta permitida.
    if (!isAllowed && fullPath !== '/point-of-sale') {
      redirect('/point-of-sale');
    }
  }


  return <>{children}</>;
}
