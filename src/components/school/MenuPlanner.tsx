'use client';

import { useState } from 'react';
import { addMenuItem, removeMenuItem } from '@/app/(dashboard)/school/menuActions';

export default function MenuPlanner({ schoolId, catalog, currentMenus }: { schoolId: string, catalog: any[], currentMenus: any[] }) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Generar fechas falsas para la semana actual basándonos en hoy para el prototipo
  const today = new Date();
  const getDayDate = (offset: number) => {
    const d = new Date(today);
    const day = d.getDay() === 0 ? 7 : d.getDay(); // 1=Mon, 7=Sun
    d.setDate(d.getDate() - day + offset);
    return d.toISOString().split('T')[0];
  };

  const weekDays = [
    { label: 'Lunes', date: getDayDate(1) },
    { label: 'Martes', date: getDayDate(2) },
    { label: 'Miércoles', date: getDayDate(3) },
    { label: 'Jueves', date: getDayDate(4) },
    { label: 'Viernes', date: getDayDate(5) }
  ];

  const handleOpenPanel = (date: string) => {
    setSelectedDate(date);
    setIsPanelOpen(true);
  };

  const handleAddProduct = async (productId: string) => {
    if (!selectedDate) return;
    setIsProcessing(true);
    try {
      await addMenuItem(schoolId, selectedDate, productId);
      setIsPanelOpen(false);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMenu = async (menuId: string) => {
    if (!confirm('¿Remover este platillo del día?')) return;
    setIsProcessing(true);
    try {
      await removeMenuItem(menuId);
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {weekDays.map((day, idx) => {
          const dayNumber = new Date(day.date + 'T12:00:00').getDate();
          return (
          <div key={day.date} className="bg-white rounded-2xl border border-[#e8f0f7] shadow-sm overflow-hidden flex flex-col">
            {/* Header Column */}
            <div className="bg-[#f0f5fb] text-center py-5 border-b border-[#e8f0f7]">
              <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest mb-1">{day.label.toUpperCase()}</p>
              <span className="text-5xl font-black text-[#2b5fa6] leading-none">{dayNumber}</span>
            </div>

            {/* Menu Cards */}
            <div className="flex-1 space-y-4">
              {currentMenus
                .filter(m => m.date === day.date)
                .map(menuItem => {
                  const product = Array.isArray(menuItem.products) ? menuItem.products[0] : menuItem.products;
                  if (!product) return null;
                  
                  return (
                    <div key={menuItem.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 relative group transition hover:shadow-md">
                      <button 
                        onClick={() => handleRemoveMenu(menuItem.id)}
                        disabled={isProcessing}
                        className="absolute -top-2 -right-2 bg-red-100 text-red-600 hover:bg-red-500 hover:text-white h-8 w-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                        title="Remover"
                      >
                        ✕
                      </button>
                      <div className="h-24 w-full bg-slate-50 rounded-xl mb-3 flex items-center justify-center overflow-hidden border border-slate-100">
                        {product.image_url ? 
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.image_url} alt="" className="object-cover h-full w-full" /> : 
                          <span className="text-3xl">🍲</span>
                        }
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight">{product.name || 'Producto'}</h3>
                      <p className="text-xs text-slate-500 mt-1">${parseFloat(product.base_price || 0).toFixed(2)}</p>
                    </div>
                  );
              })}
            </div>

            {/* Add Button */}
            <button 
              onClick={() => handleOpenPanel(day.date)}
              className="m-4 mt-auto border-2 border-dashed border-[#c8daf0] text-[#8aa8cc] font-bold py-4 rounded-xl hover:bg-[#f0f5fb] hover:text-[#2b5fa6] hover:border-[#2b5fa6] transition flex items-center justify-center gap-2 text-sm"
            >
              <span className="text-lg font-bold">+</span> AÑADIR PLATILLO
            </button>
          </div>
          );
        })}
      </div>

      {/* Slide-over Panel for Catalog */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPanelOpen(false)}></div>
          
          {/* Panel */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900">Catálogo de Platillos</h2>
                <p className="text-sm text-slate-500">Selecciona un producto para agregarlo al {weekDays.find(d => d.date === selectedDate)?.label}.</p>
              </div>
              <button onClick={() => setIsPanelOpen(false)} className="text-slate-400 hover:text-slate-900 text-2xl font-bold rounded-full h-10 w-10 flex items-center justify-center bg-slate-100">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {catalog.map(product => (
                <div key={product.id} className="flex gap-4 p-4 border border-slate-100 rounded-2xl hover:border-primary hover:shadow-md transition bg-white items-center cursor-pointer" onClick={() => handleAddProduct(product.id)}>
                  <div className="h-16 w-16 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 flex-shrink-0">
                    <span className="text-2xl">🍽️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900 leading-tight">{product.name}</h3>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm font-black text-slate-900">${parseFloat(product.base_price).toFixed(2)}</span>
                      {product.nutri_points_reward > 0 && <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-md">+{product.nutri_points_reward} pts</span>}
                    </div>
                  </div>
                  <button className="h-8 w-8 bg-primary/10 text-primary rounded-full font-black flex items-center justify-center pointer-events-none">
                    +
                  </button>
                </div>
              ))}
              
              {catalog.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl">
                  <span className="text-4xl">🛒</span>
                  <p className="font-bold text-slate-500 mt-4">Catálogo Vacío</p>
                  <p className="text-sm text-slate-400 mt-1">Agrega productos al catálogo en la pestaña anterior.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
