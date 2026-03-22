import { createClient } from '@/utils/supabase/server';
import POS_Terminal from '@/components/pos/POS_Terminal';

export default async function POSRoute() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="p-12 text-center text-red-500 font-bold">ACCESO CRÍTICO DENEGADO</div>;

  const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();

  const { data: catalog } = await supabase
    .from('products')
    .select('*')
    .eq('school_id', profile?.school_id)
    .eq('is_available', true);

  // Notice there's no layout wrapping this, so it takes the full bleed window screen for the tablet.
  return <POS_Terminal catalog={catalog || []} />;
}
