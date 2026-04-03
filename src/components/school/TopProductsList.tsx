'use client';

import { Package, TrendingUp } from 'lucide-react';

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface TopProductsListProps {
  products: TopProduct[];
}

export default function TopProductsList({ products }: TopProductsListProps) {
  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <Package className="h-12 w-12 text-slate-200 mb-4" />
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sin datos de venta registrados</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...products.map(p => p.revenue));

  return (
    <div className="space-y-6 flex-1">
      {products.map((product, idx) => {
        const percentage = (product.revenue / maxRevenue) * 100;
        
        return (
          <div key={idx} className="relative group">
            {/* Progress background */}
            <div 
              className="absolute inset-0 bg-blue-50/50 rounded-2xl -z-10 transition-all duration-500 origin-left"
              style={{ width: `${percentage}%` }}
            />
            
            <div className="flex items-center justify-between p-4 rounded-2xl border border-transparent hover:border-blue-100 transition-all">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-black text-[#1a3a5c] text-sm">
                   {idx + 1}
                </div>
                <div>
                  <h3 className="font-black text-[#1a3a5c] text-sm truncate max-w-[150px]">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-[#8aa8cc] uppercase">{product.quantity} Unidades</span>
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="font-black text-[#1a3a5c] text-sm">
                  ${product.revenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Generado</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
