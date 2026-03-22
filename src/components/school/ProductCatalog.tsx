'use client';

import { useState } from 'react';
import ProductFormModal from './ProductFormModal';

const CATEGORIES = ['comedor', 'snack', 'bebida'];

export default function ProductCatalog({ initialProducts }: { initialProducts: any[] }) {
  const [activeCategory, setActiveCategory] = useState('comedor');

  const byCategory = CATEGORIES.map(cat => ({
    key: cat,
    label: cat.toUpperCase(),
    items: initialProducts.filter(p => p.category === cat),
  }));

  const displayList = byCategory.find(c => c.key === activeCategory)?.items || [];

  return (
    <div className="space-y-6">
      {/* Category tabs */}
      <div className="grid grid-cols-3 gap-4">
        {byCategory.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex justify-between items-center px-6 py-4 rounded-xl border font-bold text-sm transition ${activeCategory === cat.key ? 'bg-[#e8f0f7] border-[#2b5fa6] text-[#2b5fa6]' : 'bg-white border-[#e8f0f7] text-[#8aa8cc] hover:bg-[#f0f5fb]'}`}
          >
            <span>{cat.label}</span>
            <span className="bg-[#f0f5fb] text-[#8aa8cc] text-xs font-bold px-2 py-0.5 rounded-full">{cat.items.length} ITEMS</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e8f0f7] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f0f5fb] text-[#8aa8cc] text-[11px] font-black uppercase tracking-widest border-b border-[#e8f0f7]">
                <th className="px-6 py-4">Producto</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4 text-center">PTS</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-right">Precio</th>
                <th className="px-6 py-4 text-center">Disponible</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayList.map(p => (
                <tr key={p.id} className="border-b border-[#f0f5fb] hover:bg-[#f8fafd] transition">
                  <td className="px-6 py-5 font-black text-[#1a3a5c]">{p.name}</td>
                  <td className="px-6 py-5">
                    <span className="bg-[#e8f0f7] text-[#2b5fa6] font-bold text-xs px-3 py-1 rounded-full uppercase">{p.category}</span>
                  </td>
                  <td className="px-6 py-5 text-center font-black text-[#f4c430]">
                    {p.nutri_points_reward > 0 ? `+${p.nutri_points_reward}★` : '—'}
                  </td>
                  <td className="px-6 py-5 text-center font-bold text-sm">
                    {p.category === 'comedor' ? (
                      <span className="text-[#b0c8e0]">—</span>
                    ) : (
                      <span className={p.stock_quantity < 10 ? 'text-red-500' : 'text-[#1a3a5c]'}>
                        {p.stock_quantity}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right font-black text-[#1a3a5c]">
                    ${parseFloat(p.base_price).toFixed(2)}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`inline-block h-3 w-3 rounded-full ${p.is_available ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  </td>
                  <td className="px-6 py-5 text-right">
                    <ProductFormModal product={p} />
                  </td>
                </tr>
              ))}
              {displayList.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-[#8aa8cc] italic text-sm">
                    No hay productos registrados en el catálogo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
