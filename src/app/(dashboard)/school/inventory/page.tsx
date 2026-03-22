import { createClient } from '@/utils/supabase/server';
import StockManager from '@/components/school/StockManager';

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user?.id).single();

  if (!profile?.school_id) return <div>Acceso denegado</div>;

  const { data: catalog } = await supabase
    .from('products')
    .select('id, name, barcode, stock_quantity, image_url, category')
    .eq('school_id', profile.school_id)
    .in('category', ['snack', 'bebida']);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Escáner de Inventario</h1>
        <p className="text-slate-500 mt-2">Agregue mercancía de snacks y bebidas utilizando la pistola de códigos de barras (o entrada de teclado manual).</p>
      </div>

      <StockManager catalog={catalog || []} />
    </div>
  );
}
