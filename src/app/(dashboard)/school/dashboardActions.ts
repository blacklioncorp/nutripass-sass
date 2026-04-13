'use server';

import { createClient, createAdminClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

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
  
  return { user, profile };
}

export async function sendMataMermasReminder(schoolId: string) {
  await ensureAdmin();
  const supabase = await createClient();

  // 1. Get all students of this school
  const { data: students, error: studentsError } = await supabase
    .from('consumers')
    .select('id, parent_id')
    .eq('school_id', schoolId)
    .eq('type', 'student');

  if (studentsError) throw new Error(studentsError.message);
  if (!students || students.length === 0) return { success: true, count: 0 };

  // 2. Identify tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowIso = tomorrow.toISOString().split('T')[0];

  // 3. Find students WHO ALREADY HAVE a pre-order for tomorrow
  const studentIds = students.map(s => s.id);
  const { data: preOrdersTomorrow } = await supabase
    .from('pre_orders')
    .select('consumer_id')
    .eq('status', 'paid')
    .or(`order_date.eq.${tomorrowIso}`);
    // Note: This logic is simple for demonstration; ideally we also check daily_menus for tomorrow

  const studentsWithOrder = new Set(preOrdersTomorrow?.map(po => po.consumer_id) || []);

  // 4. Filter parents to notify (those whose children don't have an order)
  const parentsToNotify = new Set<string>();
  students.forEach(s => {
    if (s.parent_id && !studentsWithOrder.has(s.id)) {
      parentsToNotify.add(s.parent_id);
    }
  });

  if (parentsToNotify.size === 0) return { success: true, count: 0 };

  // 5. Create notifications in DB
  const notifications = Array.from(parentsToNotify).map(parentId => ({
    user_id: parentId,
    title: '⚡ Recordatorio SafeLunch',
    message: '¡Aún no has programado el lunch de mañana! Evita mermas y asegura el platillo favorito de tu hijo reservando ahora.',
    is_read: false
  }));

  const { error: notifyError } = await supabase
    .from('notifications')
    .insert(notifications);

  if (notifyError) throw new Error(notifyError.message);

  revalidatePath('/school');
  return { success: true, count: parentsToNotify.size };
}
