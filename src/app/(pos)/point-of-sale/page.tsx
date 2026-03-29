import { createClient } from '@/utils/supabase/server';
import { getEffectiveSchoolId } from '@/utils/auth/effective-school';
import POS_Terminal from '@/components/pos/POS_Terminal';

export default async function POSRoute() {
  const supabase = await createClient();
  const schoolId = await getEffectiveSchoolId();

  if (!schoolId) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white p-12 text-center">
        <p className="text-4xl font-black mb-4 tracking-tighter uppercase">Acceso Crítico Denegado</p>
        <p className="text-slate-400 font-bold max-w-sm mx-auto">No tienes una escuela activa para operar el POS. Por favor, selecciona una escuela desde el panel maestro.</p>
      </div>
    );
  }

  const { data: catalog } = await supabase
    .from('products')
    .select('*')
    .eq('school_id', schoolId)
    .eq('is_available', true);

  // Notice there's no layout wrapping this, so it takes the full bleed window screen for the tablet.
  return <POS_Terminal catalog={catalog || []} />;
}
