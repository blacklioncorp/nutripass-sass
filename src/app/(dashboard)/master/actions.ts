'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// We must use the Service Role Key to bypass RLS and use Admin Auth functions
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key'
);

export async function createSchoolWithAdmin(prevState: any, formData: FormData) {
  const schoolName = formData.get('schoolName') as string;
  const subdomain = formData.get('subdomain') as string;
  const adminName = formData.get('adminName') as string;
  const adminEmail = formData.get('adminEmail') as string;
  const adminPassword = formData.get('adminPassword') as string;
  const commissionPercentage = parseFloat(formData.get('commissionPercentage') as string) || 5.0;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.' };
  }

  try {
    // 1. Create School
    const { data: school, error: schoolErr } = await supabaseAdmin
      .from('schools')
      .insert({ 
        name: schoolName, 
        subdomain, 
        primary_color: '#7CB9E8', 
        secondary_color: '#004B87',
        commission_percentage: commissionPercentage
      })
      .select()
      .single();

    if (schoolErr) throw new Error(`Error creando escuela: ${schoolErr.message}`);

    // 2. Create Admin Auth User
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    if (authErr) throw new Error(`Error creando usuario: ${authErr.message}`);

    // 3. Update Profile mapped by trigger
    // Note: If you don't have a trigger that auto-creates profiles on auth.users insert,
    // you might need to insert it instead of update. Assuming standard behavior (insert):
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert({ 
        id: authData.user.id,
        school_id: school.id,
        role: 'school_admin',
        full_name: adminName
      });

    if (profileErr) throw new Error(`Error actualizando perfil: ${profileErr.message}`);

    revalidatePath('/master');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function toggleSchoolStatus(schoolId: string, currentStatus: string) {
  const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
  
  const { error } = await supabaseAdmin
    .from('schools')
    .update({ status: newStatus })
    .eq('id', schoolId);

  if (error) throw new Error(error.message);
  revalidatePath('/master');
  return { success: true, newStatus };
}

export async function impersonateSchool(schoolId: string) {
  const cookieStore = await cookies();
  cookieStore.set('impersonated_school_id', schoolId, {
    path: '/',
    maxAge: 60 * 60 * 2, // 2 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  redirect('/school');
}

export async function stopImpersonation() {
  const cookieStore = await cookies();
  cookieStore.delete('impersonated_school_id');
  redirect('/master');
}
export async function updateSchoolCommission(schoolId: string, newPercentage: number) {
  const { error } = await supabaseAdmin
    .from('schools')
    .update({ commission_percentage: newPercentage })
    .eq('id', schoolId);

  if (error) throw new Error(error.message);
  revalidatePath('/master');
  return { success: true };
}
