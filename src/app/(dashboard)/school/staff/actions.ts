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

  if (!profile || (profile.role !== 'school_admin' && profile.role !== 'superadmin')) {
    throw new Error('403 Unauthorized: Se requieren permisos de administrador');
  }
}

export async function createSchoolStaff(formData: FormData) {
  try {
    await ensureAdmin();
    
    const schoolId = await getEffectiveSchoolId();
    if (!schoolId) throw new Error('Escuela no identificada');

    const email = formData.get('email') as string;
    const fullName = formData.get('full_name') as string;
    const role = formData.get('role') as 'staff' | 'school_admin';
    const password = Math.random().toString(36).slice(-12); // Temp password

    const supabaseAdmin = await createAdminClient();
    
    // 1. Create User in Auth (Admin API - doesn't logout current user)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (authError) throw authError;

    // 2. Create Profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        school_id: schoolId,
        role,
        full_name: fullName
      });

    if (profileError) {
      // Cleanup auth user on profile failure
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    revalidatePath('/school/staff');
    return { success: true, tempPassword: password };
  } catch (error: any) {
    console.error('[createSchoolStaff] Error:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteStaffMember(userId: string) {
    try {
      await ensureAdmin();
      const supabaseAdmin = await createAdminClient();
      
      // Delete profile first (cascades or manual)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);
        
      if (profileError) throw profileError;

      // Delete Auth User
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authError) throw authError;

      revalidatePath('/school/staff');
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
}
