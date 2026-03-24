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

export async function signUpAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Por favor ingresa correo y contraseña.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user) {
    // Create an initial profile as 'parent' by default if it doesn't exist
    // (A trigger in DB might do this too, but we'll be explicit here)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        email: data.user.email,
        role: 'parent',
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    // Redirect to parent dashboard (they might need to verify email first depending on Supabase settings)
    redirect('/parent');
  }

  return { success: true };
}
