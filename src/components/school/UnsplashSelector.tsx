'use client';

import { useState } from 'react';
import { Search, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function UnsplashSelector({ onSelect }: { onSelect: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [images, setImages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError('');
    
    try {
      const accessKey = process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
      if (!accessKey) {
        throw new Error("La clave de API de Unsplash no está configurada.");
      }

      // Add 'food' to query to ensure gastronomic results, and request landscape orientation
      const searchQuery = encodeURIComponent(`food ${query}`);
      const res = await fetch(`https://api.unsplash.com/search/photos?query=${searchQuery}&per_page=12&orientation=landscape&client_id=${accessKey}`);
      
      if (!res.ok) throw new Error("Error al buscar imágenes en Unsplash.");
      
      const data = await res.json();
      setImages(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (imageUrl: string) => {
    onSelect(imageUrl);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl border border-slate-200 transition-colors text-sm w-full shadow-sm">
          <ImageIcon className="h-4 w-4" />
          📸 Buscar foto profesional
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ImageIcon className="text-[#004B87] h-5 w-5" /> Galería Profesional (Unsplash)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar platillo (Ej. sándwich, jugo, manzana)"
              className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#004B87] focus:border-transparent outline-none"
              autoFocus
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoading || !query.trim()} 
            className="bg-[#004B87] hover:bg-[#003865] text-white px-5 py-2 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
          </button>
        </form>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 mt-2">
            {error}
          </div>
        )}

        <div className="mt-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="font-medium">Buscando las mejores fotos...</p>
            </div>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => handleSelect(img.urls.regular)}
                  className="relative group rounded-xl overflow-hidden aspect-video bg-slate-100 hover:ring-4 ring-[#f4c430] transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.urls.small} alt={img.alt_description || 'Foto'} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-[#f4c430] text-[#004B87] rounded-full p-2 flex items-center gap-1 text-xs font-black px-3 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform">
                      <Check className="h-4 w-4" /> Seleccionar
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : query && !isLoading && !error ? (
             <div className="text-center py-10 text-slate-500 font-medium">
               No se encontraron resultados para "{query}". Prueba con otra palabra.
             </div>
          ) : (
            <div className="text-center py-10 text-slate-400 font-medium text-sm">
              Escribe un ingrediente o platillo para buscar fotos increíbles sin derechos de autor.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
