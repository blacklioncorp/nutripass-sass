import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

/**
 * Resolves the school_id for the current session.
 * For school_admin: returns their profile.school_id
 * For superadmin: returns impersonated_school_id cookie if present, otherwise null.
 */
export async function getEffectiveSchoolId() {
  const supabase = await createClient();
  const cookieStore = await cookies();

  // 1. Get user and profile
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single();

  if (!profile) return null;

  // 2. Logic if superadmin
  if (profile.role === 'superadmin') {
    const impersonatedId = cookieStore.get('impersonated_school_id')?.value;
    return impersonatedId || null;
  }

  // 3. Logic if school_admin (or merchant, etc.)
  return profile.school_id;
}

/**
 * Checks if the current admin is in impersonation mode.
 */
export async function isImpersonating() {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return profile?.role === 'superadmin' && !!cookieStore.get('impersonated_school_id')?.value;
}
