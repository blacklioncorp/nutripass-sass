'use server';

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Por favor ingresa correo y contraseña.' };
  }

  const supabase = await createClient();

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: 'Credenciales inválidas. Por favor intenta de nuevo.' };
  }

  // Fetch user role from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  const role = profile?.role;

  // Role-based redirect
  if (role === 'superadmin') {
    redirect('/master');
  } else if (role === 'school_admin' || role === 'staff') {
    redirect('/school');
  } else if (role === 'parent') {
    redirect('/parent');
  } else {
    // default fallback
    redirect('/');
  }
}
