'use server';

import { createClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getEffectiveSchoolId } from '@/utils/auth/effective-school';

async function ensureAdmin() {
  const supabase = await createClient();
  const supabaseAdmin = await createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('No autenticado');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    throw new Error('403 Unauthorized: Se requieren permisos de administrador');
  }
}

export async function updateOperationalSettings(formData: FormData) {
  try {
    await ensureAdmin();
    
    const schoolId = await getEffectiveSchoolId();
    if (!schoolId) throw new Error('Escuela no identificada');

    const billingEmail = formData.get('billing_email') as string;
    const openingTime = formData.get('opening_time') as string;
    const closingTime = formData.get('closing_time') as string;

    const supabase = await createClient();
    
    const { error } = await supabase
      .from('schools')
      .update({
        billing_email: billingEmail,
        opening_time: openingTime,
        closing_time: closingTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', schoolId);

    if (error) throw error;

    revalidatePath('/school/settings');
    return { success: true };
  } catch (error: any) {
    console.error('[updateOperationalSettings] Error:', error);
    return { success: false, error: error.message };
  }
}
