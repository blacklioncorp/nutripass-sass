'use client';

import { useState, useRef, useEffect } from 'react';
import { getStudentStatusByNFC, processSmartCheckout } from '@/app/(pos)/actions';
import { Check, X, AlertTriangle, CreditCard, ShoppingBag, User } from 'lucide-react';

export default function POS_Terminal({ catalog }: { catalog: any[] }) {
  const [cart, setCart] = useState<any[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [nfcInput, setNfcInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Smart POS states
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [selectedPreOrderIds, setSelectedPreOrderIds] = useState<string[]>([]);
  
  const nfcInputRef = useRef<HTMLInputElement>(null);

  // Focus NFC input when Modal opens
  useEffect(() => {
    if (isCheckoutOpen && !isProcessing && !checkoutResult && !errorMsg) {
      setTimeout(() => nfcInputRef.current?.focus(), 100);
    }
  }, [isCheckoutOpen, isProcessing, checkoutResult, errorMsg]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (parseFloat(item.base_price) * item.quantity), 0);

  const handleNfcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nfcInput) return;
    
    setIsProcessing(true);
    setErrorMsg('');
    
    try {
      const resp = await getStudentStatusByNFC(nfcInput);
      if (resp.error) throw new Error(resp.error);
      
      setStudentInfo(resp.consumer);
      // Auto-select all today's pre-orders
      setSelectedPreOrderIds(resp.todayPreOrders?.map((po: any) => po.id) || []);
      // Pre-orders list for the UI
      (resp.consumer as any).todayPreOrders = resp.todayPreOrders;
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
      setNfcInput('');
    }
  };

  const handleSmartCheckout = async () => {
    if (!studentInfo) return;
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const resp = await processSmartCheckout(
        studentInfo.id,
        selectedPreOrderIds,
        cart,
        cartTotal
      );
      if (resp.error) throw new Error(resp.error);
      
      setCheckoutResult(resp.result);
      setCart([]);
      setStudentInfo(null);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCheckout = () => {
    setIsCheckoutOpen(false);
    setCheckoutResult(null);
    setErrorMsg('');
    setStudentInfo(null);
    setSelectedPreOrderIds([]);
  };

  const togglePreOrder = (id: string) => {
    setSelectedPreOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* LEFT PANEL: CART */}
      <div className="w-[350px] bg-white border-r border-slate-200 shadow-xl flex flex-col z-10 relative">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center shadow-md">
          <h2 className="text-xl font-black tracking-widest">NUTRIPASS POS</h2>
          <span className="text-xs font-bold opacity-50 bg-white/20 px-2 py-1 rounded">CAJA VIRTUAL</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300">
              <span className="text-6xl mb-4">🛒</span>
              <p className="font-bold">El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center gap-3 animate-in slide-in-from-left duration-200">
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 leading-tight">{item.name}</h4>
                  <p className="text-xs font-bold text-primary">${parseFloat(item.base_price).toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-2 shadow-sm">
                  <span className="font-black text-slate-900 w-6 text-center">{item.quantity}</span>
                </div>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="h-8 w-8 rounded-full bg-red-100 text-red-600 hover:bg-red-500 hover:text-white font-bold transition flex items-center justify-center"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-20">
          <div className="flex justify-between items-end mb-6">
            <span className="text-slate-500 font-bold uppercase tracking-widest text-sm">Total Orden</span>
            <span className="text-4xl font-black text-slate-900">${cartTotal.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => setIsCheckoutOpen(true)}
            disabled={cart.length === 0}
            className="w-full bg-primary text-white font-black text-xl py-5 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95"
          >
            COBRAR ${cartTotal.toFixed(2)}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: CATALOG GRID */}
      <div className="flex-1 p-8 overflow-y-auto bg-[#F0F8FF]">
        {catalog.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <span className="text-6xl mb-4">🍩</span>
            <h2 className="text-2xl font-black text-slate-800 mb-2">Catálogo Vacío</h2>
            <p>No tienes productos registrados en tu escuela.</p>
            <p>Ve a "Catálogo Productos" en tu panel para añadir Snacks o Bebidas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-2">
            {catalog.map(product => (
              <div 
                key={product.id} 
                onClick={() => addToCart(product)}
                className="bg-white rounded-3xl p-4 shadow-sm hover:shadow-xl border-2 border-transparent hover:border-primary cursor-pointer transition-all transform hover:-translate-y-1 active:scale-95 flex flex-col items-center text-center relative overflow-hidden"
              >
                {product.stock_quantity !== null && product.stock_quantity <= 5 && (
                   <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-bl-lg">
                     Quedan {product.stock_quantity}
                   </div>
                )}
                {product.nutri_points_reward > 0 && (
                  <div className="absolute top-2 left-2 bg-accent/20 text-accent text-xs font-black px-2 py-1 rounded-lg">
                    +{product.nutri_points_reward} pts
                  </div>
                )}
                <div className="h-24 w-full bg-slate-50 rounded-2xl mb-4 flex items-center justify-center overflow-hidden border border-slate-100">
                  {product.image_url ? 
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" /> :
                    <span className="text-4xl">{product.category === 'bebida' ? '🥤' : product.category === 'snack' ? '🥨' : '🍲'}</span>
                  }
                </div>
                <h3 className="font-black text-slate-800 leading-tight mb-2 line-clamp-2 min-h-[40px] flex items-center justify-center">{product.name}</h3>
                <div className="mt-auto block w-full bg-slate-100 text-primary font-black py-2 rounded-xl text-lg">
                  ${parseFloat(product.base_price).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CHECKOUT MODAL (WAITING FOR NFC) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={resetCheckout}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-200">
            
            {checkoutResult ? (
              <div className="text-center py-6">
                <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">✓</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">¡Cobro Exitoso!</h2>
                <p className="text-slate-500 mb-6">Gracias <b>{checkoutResult.consumer_name}</b></p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 font-code text-center">
                  <p className="text-sm text-slate-500">Nuevo Saldo:</p>
                  <p className={`text-2xl font-black ${checkoutResult.new_balance < 0 ? 'text-red-500' : 'text-slate-900'}`}>${checkoutResult.new_balance}</p>
                  {checkoutResult.overdraft_triggered && (
                    <p className="text-xs text-red-500 mt-2 font-bold animate-pulse">FONDO DE EMERGENCIA UTILIZADO</p>
                  )}
                </div>
                <button onClick={resetCheckout} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition">
                  CERRAR (Siguiente Cliente)
                </button>
              </div>
            ) : errorMsg ? (
              <div className="text-center py-6">
                <div className="h-20 w-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <X className="h-10 w-10" />
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-2">Error en Transacción</h2>
                <p className="text-red-600 font-bold bg-red-50 p-4 rounded-xl border border-red-200 mb-6">{errorMsg}</p>
                <button onClick={() => { setErrorMsg(''); setStudentInfo(null); }} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition mb-2">
                  INTENTAR DE NUEVO
                </button>
                <button onClick={resetCheckout} className="w-full bg-white text-slate-500 font-bold py-3 rounded-xl hover:bg-slate-50 border border-slate-200 transition">
                  CANCELAR
                </button>
              </div>
            ) : studentInfo ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-none">{studentInfo.first_name} {studentInfo.last_name}</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{studentInfo.type}</p>
                    {studentInfo.allergies?.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-red-500 font-black text-[10px] animate-pulse">
                        <AlertTriangle className="h-3 w-3" /> ALERGIAS: {studentInfo.allergies.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Saldos de Billeteras */}
                <div className="grid grid-cols-2 gap-3">
                  {studentInfo.wallets?.map((w: any) => (
                    <div key={w.type} className="bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{w.type}</p>
                      <p className={`font-black text-lg ${w.balance < 0 ? 'text-red-500' : 'text-slate-900'}`}>${w.balance.toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {/* Pre-órdenes de Hoy */}
                {studentInfo.todayPreOrders?.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <ShoppingBag className="h-4 w-4" />
                      <span className="text-xs font-black uppercase tracking-widest">Pre-órdenes para Hoy</span>
                    </div>
                    <div className="space-y-2">
                      {studentInfo.todayPreOrders.map((po: any) => (
                        <label 
                          key={po.id} 
                          className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
                            selectedPreOrderIds.includes(po.id) 
                              ? 'border-emerald-500 bg-emerald-50' 
                              : 'border-slate-100 bg-white opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={selectedPreOrderIds.includes(po.id)}
                              onChange={() => togglePreOrder(po.id)}
                            />
                            <div className={`h-5 w-5 rounded-md flex items-center justify-center border-2 ${
                              selectedPreOrderIds.includes(po.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200'
                            }`}>
                              {selectedPreOrderIds.includes(po.id) && <Check className="h-3 w-3" />}
                            </div>
                            <span className="text-sm font-bold text-slate-700">{po.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">PAGADO</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Checkout Button */}
                <div className="pt-4 border-t border-slate-100">
                   {cart.length > 0 && (
                     <div className="mb-4 bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center text-blue-700">
                        <span className="text-xs font-black uppercase tracking-widest">Cobro Extra (Hoy)</span>
                        <span className="font-black">${cartTotal.toFixed(2)}</span>
                     </div>
                   )}
                   <button 
                     onClick={handleSmartCheckout}
                     disabled={isProcessing || (cart.length === 0 && selectedPreOrderIds.length === 0)}
                     className="w-full bg-slate-900 text-white font-black text-lg py-4 rounded-xl shadow-xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                   >
                     {isProcessing ? 'Procesando...' : (
                       <>
                         <CreditCard className="h-5 w-5" />
                         FINALIZAR CHECKOUT
                       </>
                     )}
                   </button>
                   <button 
                     onClick={() => setStudentInfo(null)}
                     className="w-full text-sm text-slate-400 font-bold py-3 mt-2 hover:text-slate-600"
                   >
                     Cancelar y re-escanear
                   </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="h-24 w-24 bg-blue-50 relative rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner overflow-hidden border border-blue-100">
                  <div className="absolute inset-0 border-4 border-primary rounded-[2rem] opacity-50 animate-ping"></div>
                  <span className="text-5xl animate-pulse">💳</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Identificar Alumno</h2>
                <p className="text-slate-500 mb-6 max-w-xs mx-auto">Acerca la pulsera al lector o teclea la matrícula para cobrar <b>${cartTotal.toFixed(2)}</b>.</p>
                
                <form onSubmit={handleNfcSubmit} className="max-w-[250px] mx-auto">
                  <input 
                    ref={nfcInputRef}
                    type="text"
                    placeholder="Ej. 2024-001"
                    value={nfcInput}
                    onChange={(e) => setNfcInput(e.target.value)}
                    className="w-full text-center font-black text-2xl tracking-widest text-slate-700 bg-slate-100 border-2 border-slate-200 rounded-xl py-4 focus:ring-4 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all outline-none"
                    onBlur={() => { if(!isProcessing) nfcInputRef.current?.focus() }}
                    autoComplete="off"
                  />
                  <button type="submit" className="opacity-0 w-0 h-0 p-0 m-0 absolute">Submit</button>
                </form>

                <p className="text-xs text-slate-400 font-medium mt-6">* El lector físico también está activo</p>
                <button onClick={resetCheckout} className="mt-6 text-sm text-slate-400 font-bold hover:text-slate-600">
                  Cancelar Operación
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
