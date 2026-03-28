'use client';

import { useState } from 'react';
import { processPreorderCheckout } from '@/app/(portal)/parent/actions';

export default function WeeklyPreOrder({ consumer, dailyMenus, existingPreorders }: { consumer: any, dailyMenus: any[], existingPreorders: any[] }) {
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Consider a 'comedor' wallet
  const wallet = consumer.wallets?.find((w: any) => w.type === 'comedor') || consumer.wallets?.[0];

  const handleToggle = (menuId: string, isAlreadyPaid: boolean) => {
    if (isAlreadyPaid) return;
    if (selectedMenus.includes(menuId)) {
      setSelectedMenus(selectedMenus.filter(id => id !== menuId));
    } else {
      setSelectedMenus([...selectedMenus, menuId]);
    }
  };

  const totalToPay = selectedMenus.reduce((acc, menuId) => {
    const menu = dailyMenus.find(m => m.id === menuId);
    const price = menu?.products?.base_price ?? menu?.combo_price ?? 70;
    return acc + (menu ? parseFloat(String(price)) : 0);
  }, 0);

  const handleCheckout = async () => {
    if (selectedMenus.length === 0 || !wallet) return;
    setIsProcessing(true);
    try {
      const res = await processPreorderCheckout(consumer.id, wallet.id, selectedMenus, totalToPay);
      if (res.success) {
        if (res.overdraft) {
           alert('¡Pre-órdenes cobradas exitosamente! Ojo: Se utilizó el Fondo de Emergencia, tu saldo es negativo.');
        } else {
           alert('¡Pre-órdenes cobradas exitosamente!');
        }
        setSelectedMenus([]);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-black text-slate-900">Menú para: {consumer.first_name}</h2>
          <p className="text-slate-500 font-medium">Billetera Comedor: <span className={`font-black tracking-wide ${wallet?.balance < 0 ? 'text-red-500' : 'text-slate-700'}`}>${parseFloat(wallet?.balance || 0).toFixed(2)}</span></p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total a Pagar</p>
          <p className="text-3xl font-black text-primary">${totalToPay.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {dailyMenus.map(menu => {
          const isSelected = selectedMenus.includes(menu.id);
          const isAlreadyPaid = existingPreorders.some((po: any) => po.daily_menu_id === menu.id && po.consumer_id === consumer.id);

          return (
            <div 
              key={menu.id} 
              onClick={() => handleToggle(menu.id, isAlreadyPaid)}
              className={`relative overflow-hidden transition-all duration-300 rounded-3xl p-5 border-2 cursor-pointer
                ${isAlreadyPaid ? 'border-green-500 bg-green-50 opacity-80 cursor-default' : 
                  isSelected ? 'border-primary bg-primary/5 shadow-md transform -translate-y-1' : 
                  'border-slate-100 bg-white hover:border-primary hover:shadow'}
              `}
            >
              {isAlreadyPaid && (
                <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-black px-3 py-1 rounded-bl-xl tracking-widest">
                  PAGADO ✓
                </div>
              )}
              {isSelected && !isAlreadyPaid && (
                <div className="absolute top-4 right-4 h-6 w-6 bg-primary rounded-full flex items-center justify-center text-white">
                  ✓
                </div>
              )}

              <p className="font-bold text-slate-400 text-sm mb-2">{new Date(menu.date).toLocaleDateString('es-ES', { weekday: 'long' })}</p>
              
              <div className="h-24 bg-slate-100 rounded-2xl mb-4 overflow-hidden border border-slate-200">
                {menu.products && menu.products.image_url ? 
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={menu.products.image_url} alt="" className="w-full h-full object-cover" /> :
                  <div className="w-full h-full flex items-center justify-center text-4xl">🍲</div>
                }
              </div>

              <h3 className="font-black text-slate-900 text-lg leading-tight mb-1">{menu.products?.name || 'Menú del Día'}</h3>
              <p className="text-slate-500 text-sm mb-4 line-clamp-2">
                {menu.main_course_name ? `${menu.soup_name ? menu.soup_name + ', ' : ''}${menu.main_course_name}` : (menu.products?.description || 'Delicioso platillo del día preparado en cocina.')}
              </p>
              
              <div className="flex justify-between items-end mt-auto">
                <span className="font-black text-slate-900 text-xl">${parseFloat(String(menu.products?.base_price ?? menu.combo_price ?? 70)).toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedMenus.length > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-8 py-5 rounded-full shadow-2xl flex items-center gap-6 z-50 animate-in slide-in-from-bottom border-4 border-slate-800">
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">órdenes seleccionadas</p>
            <p className="text-xl font-black">{selectedMenus.length} platillos</p>
          </div>
          <button 
            onClick={handleCheckout} 
            disabled={isProcessing}
            className="bg-primary hover:bg-blue-600 font-black text-lg px-8 py-3 rounded-full transition disabled:opacity-50"
          >
            {isProcessing ? 'Procesando...' : `Pagar $${totalToPay.toFixed(2)}`}
          </button>
        </div>
      )}
    </div>
  );
}
