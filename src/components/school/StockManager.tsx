'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function StockManager({ catalog }: { catalog: any[] }) {
  const [barcode, setBarcode] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [addQty, setAddQty] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Keep focus on the barcode listener when idle
    if (!selectedProduct) {
      inputRef.current?.focus();
    }
  }, [selectedProduct]);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode) return;
    
    // Find product in local catalog
    const product = catalog.find(p => p.barcode === barcode);
    if (product) {
      setSelectedProduct(product);
      setAddQty(0);
      setMessage('');
    } else {
      setSelectedProduct(null);
      setMessage(`Código no encontrado en catálogo: ${barcode}`);
    }
    setBarcode('');
  };

  const handleUpdateStock = async () => {
    if (!selectedProduct || addQty === 0) return;
    setIsProcessing(true);
    try {
      const newStock = (selectedProduct.stock_quantity || 0) + addQty;
      const { error } = await supabase.from('products').update({ stock_quantity: newStock }).eq('id', selectedProduct.id);
      if (error) throw error;
      
      setMessage(`¡Inventario actualizado! ${selectedProduct.name} ahora tiene ${newStock} piezas.`);
      setSelectedProduct(null);
      router.refresh();
    } catch(err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
      
      {!selectedProduct ? (
        <div className="text-center w-full max-w-sm">
          <div className="h-24 w-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
             <span className="text-4xl animate-bounce">📟</span>
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Escaneo Rápido</h2>
          <p className="text-slate-500 mb-6 text-sm">El sistema está escuchando. Utilice la pistola de códigos de barras física sobre el producto.</p>
          
          <form onSubmit={handleScan} className="relative">
            <input 
              ref={inputRef}
              type="text"
              value={barcode}
              onChange={e => setBarcode(e.target.value)}
              className="w-full p-4 border-2 border-primary/50 rounded-2xl focus:outline-none focus:border-primary font-code text-center tracking-widest bg-primary/5 transition"
              placeholder="Escaneando..."
              autoComplete="off"
            />
          </form>

          {message && <p className="mt-4 text-red-500 font-bold bg-red-50 p-3 rounded-lg text-sm">{message}</p>}
        </div>
      ) : (
        <div className="text-center w-full max-w-sm animate-in zoom-in-95">
          <h2 className="text-xl font-black text-slate-900 mb-2">Añadir Stock</h2>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6 flex flex-col items-center">
            {selectedProduct.image_url ? 
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedProduct.image_url} alt="" className="h-16 mb-2" /> : 
              <span className="text-4xl mb-2">📦</span>
            }
            <h3 className="font-bold text-slate-800">{selectedProduct.name}</h3>
            <p className="text-sm text-slate-500 font-code mt-1">Stock Actual: <span className="font-black text-slate-900">{selectedProduct.stock_quantity || 0}</span></p>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <button onClick={() => setAddQty(Math.max(1, addQty - 1))} className="h-12 w-12 bg-slate-100 text-slate-600 rounded-xl font-black text-xl hover:bg-slate-200 transition">-</button>
            <input 
              type="number" 
              value={addQty} 
              onChange={e => setAddQty(parseInt(e.target.value) || 0)}
              className="flex-1 h-12 border border-slate-200 rounded-xl text-center font-black text-2xl focus:border-primary focus:outline-none"
            />
            <button onClick={() => setAddQty(addQty + 1)} className="h-12 w-12 bg-slate-100 text-slate-600 rounded-xl font-black text-xl hover:bg-slate-200 transition">+</button>
          </div>

          <button 
            onClick={handleUpdateStock}
            disabled={isProcessing || addQty === 0}
            className="w-full bg-primary text-white font-black py-4 rounded-xl shadow hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isProcessing ? 'Guardando...' : `Añadir +${addQty} Piezas`}
          </button>
          
          <button 
            onClick={() => { setSelectedProduct(null); setMessage(''); }}
            className="mt-4 text-slate-400 font-bold text-sm hover:text-slate-600"
          >
            Cancelar Escaneo
          </button>
        </div>
      )}
    </div>
  );
}
