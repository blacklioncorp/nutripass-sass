import { createClient } from '@/utils/supabase/server';
import ProductCatalog from '@/components/school/ProductCatalog';
import ProductFormModal from '@/components/school/ProductFormModal';

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
        <ProductFormModal />
      </div>
      <ProductCatalog initialProducts={products || []} />
    </div>
  );
}
