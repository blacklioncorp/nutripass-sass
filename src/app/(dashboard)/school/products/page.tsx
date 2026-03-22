import { createClient } from '@/utils/supabase/server';
import ProductCatalog from '@/components/school/ProductCatalog';

export default async function ProductsRoute() {
  const supabase = await createClient();

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-[#8aa8cc] font-bold text-xs uppercase tracking-widest mb-1">CATÁLOGO PRODUCTOS</p>
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <h1 className="text-4xl font-black text-[#1a3a5c] tracking-tight">Catálogo de Cafetería</h1>
          </div>
          <p className="text-[#8aa8cc] font-medium mt-1 text-sm">Administra los productos y el inventario disponible.</p>
        </div>
        <button className="bg-[#f4c430] hover:bg-[#e6b310] text-[#1a3a5c] font-black px-6 py-3 rounded-xl shadow transition active:scale-95 flex items-center gap-2 text-sm whitespace-nowrap">
          + NUEVO PRODUCTO
        </button>
      </div>
      <ProductCatalog initialProducts={products || []} />
    </div>
  );
}
