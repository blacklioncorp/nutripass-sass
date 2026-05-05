'use client';

import { useActionState, useState, useEffect, useRef } from 'react';
import { upsertProduct } from '@/app/(dashboard)/school/productActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import UnsplashSelector from './UnsplashSelector';
import { X, Package, Sparkles, Loader2 } from 'lucide-react';
import { detectAllergensAction } from '@/app/(dashboard)/school/productActions';


export default function ProductFormModal({ product }: { product?: any }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(upsertProduct, null);
  
  // Reactivity for category
  const [category, setCategory] = useState(product?.category || 'comedor');
  // State for image
  const [imageUrl, setImageUrl] = useState(product?.image_url || '');
  // Allergen chips state — these are the MANUAL, authoritative source
  const [allergens, setAllergens] = useState<string[]>(
    Array.isArray(product?.allergens) ? product.allergens : []
  );
  const [allergenInput, setAllergenInput] = useState('');
  const allergenInputRef = useRef<HTMLInputElement>(null);

  // AI Detection State
  const [isDetecting, setIsDetecting] = useState(false);
  const [productName, setProductName] = useState(product?.name || '');
  const [productDesc, setProductDesc] = useState(product?.description || '');

  const handleAIDetection = async () => {
    if (!productName && !productDesc) return;
    setIsDetecting(true);
    try {
      const detected = await detectAllergensAction(productName, productDesc);
      if (detected.length > 0) {
        // Merge with existing allergens, unique
        setAllergens(prev => {
          const combined = [...prev, ...detected];
          return Array.from(new Set(combined.map(a => a.toLowerCase())))
            .map(a => detected.find(d => d.toLowerCase() === a) || prev.find(p => p.toLowerCase() === a) || a);
        });
      }
    } catch (err) {
      console.error("AI Detection error", err);
    } finally {
      setIsDetecting(false);
    }
  };


  const addAllergen = () => {
    const trimmed = allergenInput.trim();
    if (trimmed && !allergens.map(a => a.toLowerCase()).includes(trimmed.toLowerCase())) {
      setAllergens(prev => [...prev, trimmed]);
    }
    setAllergenInput('');
  };
  const removeAllergen = (item: string) => setAllergens(prev => prev.filter(a => a !== item));

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
    }
  }, [state]);

  const showsStock = true; // category === 'snack' || category === 'bebida';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? (
           <button className="text-primary hover:text-blue-800 text-sm font-bold transition">Editar</button>
        ) : (
           <button className="bg-[#f4c430] hover:bg-[#e6b310] text-[#1a3a5c] font-black px-6 py-3 rounded-xl shadow transition active:scale-95 flex items-center gap-2 text-sm whitespace-nowrap">
             + NUEVO PRODUCTO
           </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900">
            {product ? 'Editar Producto' : 'Crear Producto'}
          </DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4 mt-2">
          {product && <input type="hidden" name="id" value={product.id} />}
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Comercial</label>
            <input 
              name="name" 
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required 
              className="w-full p-2 border border-slate-200 rounded-lg" 
              placeholder="Ej. Ensalada César o Papas Fritas" 
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-bold text-slate-700 text-[#2b5fa6]">Descripción / Ingredientes</label>
            </div>
            <textarea 
              name="description" 
              value={productDesc}
              onChange={(e) => setProductDesc(e.target.value)}
              rows={2} 
              className="w-full p-2 border border-slate-200 rounded-lg text-sm" 
              placeholder="Ej. Lechuga, crutones, queso parmesano y aderezo especial (contiene leche y huevo)."
            />
            <button
              type="button"
              onClick={handleAIDetection}
              disabled={isDetecting || (!productName && !productDesc)}
              className="mt-2 flex items-center gap-2 text-xs font-black text-[#2b5fa6] bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-all active:scale-95 disabled:opacity-50"
            >
              {isDetecting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Detectando Alérgenos...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  Sugerir Alérgenos con IA
                </>
              )}
            </button>
          </div>

          {/* Manual Allergens — simplified UX */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <label className="block text-sm font-bold text-slate-600 mb-2 italic">Alérgenos (Opcional)</label>
            <input type="hidden" name="manualAllergens" value={allergens.join(',')} />
            <div className="flex gap-2">
              <input
                ref={allergenInputRef}
                type="text"
                value={allergenInput}
                onChange={e => setAllergenInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAllergen(); } }}
                placeholder="ej. Gluten, Lácteos, Nueces..."
                className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#2b5fa6] transition"
              />
              <button
                type="button"
                onClick={addAllergen}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-black rounded-lg hover:bg-slate-300 transition uppercase tracking-tighter"
              >
                Añadir
              </button>
            </div>
            {allergens.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-3">
                {allergens.map(al => (
                  <span key={al} className="flex items-center gap-1 bg-white text-slate-700 text-[10px] font-black uppercase tracking-tight px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                    {al}
                    <button type="button" onClick={() => removeAllergen(al)} className="text-slate-400 hover:text-red-500 ml-1 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                Usa el botón de IA arriba o escribe manualmente. Si no hay nada, el sistema asumirá que es seguro o intentará detectarlo al guardar.
              </p>
            )}
          </div>


          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Precio Base ($)</label>
              <input name="basePrice" type="number" step="0.01" defaultValue={product?.base_price} required className="w-full p-2 border border-slate-200 rounded-lg" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label>
              <select 
                name="category" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="comedor">Desayuno (Preparado)</option>
                <option value="snack">Snack (Empaquetado)</option>
                <option value="bebida">Bebida</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Foto del Producto (Unsplash)</label>
            <input type="hidden" name="imageUrl" value={imageUrl} />
            
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
              {imageUrl ? (
                <div className="h-24 w-full sm:w-36 relative rounded-lg overflow-hidden border-2 border-[#f4c430] shrink-0 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setImageUrl('')} className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded-full text-xs flex items-center justify-center transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-24 w-full sm:w-36 rounded-lg bg-white border border-dashed border-slate-300 flex items-center justify-center shrink-0">
                  <Package className="h-8 w-8 text-slate-300" />
                </div>
              )}
              
              <div className="flex-1 w-full">
                <UnsplashSelector onSelect={(url) => setImageUrl(url)} />
                <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-wide leading-tight">Busca y selecciona una foto profesional libre de derechos para hacer tu producto más atractivo en el portal.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            {showsStock && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Inventario (Pzs)</label>
                <input name="stockQuantity" type="number" defaultValue={product?.stock_quantity || 0} required className="w-full p-2 border border-slate-200 rounded-lg" />
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">FALTANTES SERÁN MERMA</p>
              </div>
            )}
            
            <div className={!showsStock ? 'col-span-2' : ''}>
              <label className="block text-sm font-bold text-slate-700 mb-1 text-accent">Premio Nutri-Puntos ★</label>
              <input name="nutriPoints" type="number" defaultValue={product?.nutri_points_reward || 0} className="w-full p-2 border border-slate-200 rounded-lg focus:ring-accent" />
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">PUNTOS POR COMPRAR OPCIÓN SANA</p>
            </div>
          </div>

          {state?.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
              {state.error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg disabled:opacity-50 shadow flex items-center gap-2">
              {isPending ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Analizando con IA...
                </>
              ) : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
