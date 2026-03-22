import { createClient } from '@/utils/supabase/server';
import ConsumersManager from '@/components/school/ConsumersManager';

export default async function ConsumersPage() {
  const supabase = await createClient();

  // RLS will automatically filter consumers by the logged-in admin's school_id
  const { data: consumers } = await supabase
    .from('consumers')
    .select(`
      *,
      wallets (
        id, type, balance
      )
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-[#8aa8cc] font-bold text-xs uppercase tracking-widest mb-1">GESTIÓN USUARIOS</p>
          <h1 className="text-4xl font-black text-[#1a3a5c] tracking-tight">Directorio de Usuarios</h1>
        </div>
      </div>
      <ConsumersManager initialConsumers={consumers || []} />
    </div>
  );
}
