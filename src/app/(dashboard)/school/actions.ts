'use server';

import { createClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getEffectiveSchoolId } from '@/utils/auth/effective-school';

export async function createConsumer(prevState: any, formData: FormData) {
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const identifier = formData.get('identifier') as string;
  const type = formData.get('type') as 'student' | 'staff';
  const grade = formData.get('grade') as string;
  const parentEmail = (formData.get('parentEmail') as string)?.trim().toLowerCase() || null;

  // Fix: use admin client to bypass RLS (needed when superadmin is impersonating)
  const supabaseAdmin = await createAdminClient();

  const schoolId = await getEffectiveSchoolId();
  if (!schoolId) return { error: 'Escuela no asignada' };

  const { data: consumer, error } = await supabaseAdmin
    .from('consumers')
    .insert({
      school_id: schoolId,
      first_name: firstName,
      last_name: lastName,
      identifier,
      type,
      grade: type === 'student' ? grade : null,
      parent_email: type === 'student' ? parentEmail : null,
      is_active: true
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Create BOTH wallets (comedor + snack) for this consumer
  const { error: walletError } = await supabaseAdmin
    .from('wallets')
    .insert([
      { consumer_id: consumer.id, type: 'comedor', balance: 0.00 },
      { consumer_id: consumer.id, type: 'snack', balance: 0.00 },
    ]);

  if (walletError) return { error: walletError.message };

  revalidatePath('/school/consumers');
  return { success: true, data: consumer };
}

export async function updateConsumer(prevState: any, formData: FormData) {
  const consumerId = formData.get('id') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const identifier = formData.get('identifier') as string;
  const type = formData.get('type') as 'student' | 'staff';
  const grade = formData.get('grade') as string;
  const parentEmail = (formData.get('parentEmail') as string)?.trim().toLowerCase() || null;

  const supabaseAdmin = await createAdminClient();

  const schoolId = await getEffectiveSchoolId();
  if (!schoolId) return { error: 'Profile not found' };

  const { data: consumer, error } = await supabaseAdmin
    .from('consumers')
    .update({
      first_name: firstName,
      last_name: lastName,
      identifier,
      type,
      grade: type === 'student' ? grade : null,
      parent_email: type === 'student' ? parentEmail : null,
    })
    .eq('id', consumerId)
    .eq('school_id', schoolId)
    .select()
    .single();

  if (error) return { error: error.message };
  
  revalidatePath('/school/consumers');
  return { success: true, data: consumer };
}

export async function linkNfcTag(consumerId: string, nfcTagUid: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('consumers')
    .update({ nfc_tag_uid: nfcTagUid })
    .eq('id', consumerId);

  if (error) throw new Error(error.message);
  revalidatePath('/school/consumers');
}
