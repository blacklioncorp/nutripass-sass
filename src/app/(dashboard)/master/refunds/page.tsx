import { createAdminClient } from '@/utils/supabase/server';
import AdminRefundDashboard from '@/components/master/AdminRefundDashboard';

export const metadata = {
  title: 'Reembolsos y Bajas Escolares | SafeLunch Admin',
  description: 'Consola de administración para gestionar solicitudes de baja escolar y procesar liquidaciones de cuentas.',
};

export default async function RefundsPage() {
  const supabase = await createAdminClient();

  // Fetch consumers with status 'cancellation_requested' or 'closed',
  // joining their wallets and the parent's profile (via parent_id → profiles).
  // NOTE: There is no separate `parents` table — parent data lives directly in
  // consumers (parent_email) and in auth.users via parent_id.
  const { data, error } = await supabase
    .from('consumers')
    .select(`
      id,
      first_name,
      last_name,
      identifier,
      status,
      cancellation_requested_at,
      parent_email,
      parent_id,
      school_id,
      schools ( name ),
      wallets ( id, type, balance, status ),
      profiles:parent_id (
        full_name
      )
    `)
    .in('status', ['cancellation_requested', 'closed'])
    .order('cancellation_requested_at', { ascending: false });

  if (error) {
    console.error('[RefundsPage] Error fetching data:', error.message);
  }

  // Pre-compute net refund amount server-side for each row
  const consumers = (data || []).map((c: any) => {
    const comedorWallet  = c.wallets?.find((w: any) => w.type === 'comedor');
    const snackWallet    = c.wallets?.find((w: any) => w.type === 'snack');
    const comedorBalance = parseFloat(comedorWallet?.balance ?? 0);
    const snackBalance   = parseFloat(snackWallet?.balance ?? 0);
    const gross          = comedorBalance + snackBalance;
    const adminFee       = Math.max(gross, 0) * 0.05;
    const refundAmount   = Math.max(gross - adminFee, 0);

    // profiles join may be null if parent hasn't created their account yet
    const parentFullName: string = c.profiles?.full_name ?? '';
    const parentNameParts        = parentFullName.trim().split(' ');
    const parentFirstName        = parentNameParts[0] ?? '—';
    const parentLastName         = parentNameParts.slice(1).join(' ') || '—';

    return {
      id:                      c.id,
      studentId:               c.identifier ?? '',
      firstName:               c.first_name,
      lastName:                c.last_name,
      status:                  c.status as 'cancellation_requested' | 'closed',
      cancellationRequestedAt: c.cancellation_requested_at,
      schoolName:              c.schools?.name ?? '—',
      parentFirstName,
      parentLastName,
      parentEmail:             c.parent_email ?? '—',
      parentPhone:             '—',
      comedorBalance,
      snackBalance,
      comedorWalletStatus:     comedorWallet?.status ?? 'active',
      snackWalletStatus:       snackWallet?.status ?? 'active',
      grossBalance:            gross,
      adminFee:                Math.round(adminFee * 100) / 100,
      refundAmount:            Math.round(refundAmount * 100) / 100,
      hasOverdraft:            gross < 0,
    };
  });

  return <AdminRefundDashboard consumers={consumers} />;
}
