'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createConsumer(prevState: any, formData: FormData) {
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const identifier = formData.get('identifier') as string;
  const type = formData.get('type') as 'student' | 'staff';
  const grade = formData.get('grade') as string;
  const parentEmail = (formData.get('parentEmail') as string)?.trim().toLowerCase() || null;
  
  const supabase = await createClient();

  // First, we need the school_id of the current admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autorizado' };

  const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();
  if (!profile?.school_id) return { error: 'Escuela no asignada' };

  const { data: consumer, error } = await supabase
    .from('consumers')
    .insert({
      school_id: profile.school_id,
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

  // Create a default 'comedor' wallet for this consumer
  const { error: walletError } = await supabase
    .from('wallets')
    .insert({
      consumer_id: consumer.id,
      type: 'comedor',
      balance: 0.00
    });

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
  
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('school_id')
    .eq('id', user.id)
    .single();

  if (!profile) return { error: 'Profile not found' };

  const { data: consumer, error } = await supabase
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
    .eq('school_id', profile.school_id)
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
