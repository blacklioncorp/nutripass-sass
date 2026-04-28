'use client';

import { useState, useRef, useEffect } from 'react';
import { getStudentStatusByNFC, processSmartCheckout } from '@/app/(pos)/actions';
import { Check, X, AlertTriangle, CreditCard, ShoppingBag, User, ArrowRight } from 'lucide-react';

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
  const [checkoutPhase, setCheckoutPhase] = useState<'scan' | 'comedor' | 'snack' | 'success'>('scan');
  const [combinedResults, setCombinedResults] = useState<string[]>([]);
  
  const nfcInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCheckoutOpen && checkoutPhase === 'scan' && !isProcessing && !checkoutResult && !errorMsg) {
      setTimeout(() => nfcInputRef.current?.focus(), 100);
    }
  }, [isCheckoutOpen, checkoutPhase, isProcessing, checkoutResult, errorMsg]);

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

  const isComida = (cat: string) => {
    const c = cat?.trim().toUpperCase();
    return c === 'DESAYUNO (PREPARADO)' || c === 'DESAYUNO' || c === 'COMIDA' || c === 'COMEDOR';
  };

  const comedorTotal = cart.reduce((acc, item) => isComida(item.category) ? acc + (parseFloat(item.base_price) * item.quantity) : acc, 0);
  const snackTotal = cart.reduce((acc, item) => !isComida(item.category) ? acc + (parseFloat(item.base_price) * item.quantity) : acc, 0);

  const handleNfcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nfcInput) return;
    
    setIsProcessing(true);
    setErrorMsg('');
    
    try {
      const resp = await getStudentStatusByNFC(nfcInput);
      if (resp.error) throw new Error(resp.error);
      
      setStudentInfo(resp.consumer);
      const preOrders = resp.todayPreOrders?.map((po: any) => po.id) || [];
      setSelectedPreOrderIds(preOrders);
      (resp.consumer as any).todayPreOrders = resp.todayPreOrders;

      // Determine next phase
      if (comedorTotal > 0 || preOrders.length > 0) {
        setCheckoutPhase('comedor');
      } else if (snackTotal > 0) {
        setCheckoutPhase('snack');
      } else {
        setCheckoutPhase('comedor'); // Empty cart fallback
      }

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
      setNfcInput('');
    }
  };

  const handleComedorCheckout = async (skip: boolean = false) => {
    if (!studentInfo) return;
    setErrorMsg('');

    if (skip) {
      if (snackTotal > 0) {
        setCheckoutPhase('snack');
      } else {
        setCheckoutPhase('success');
        if (combinedResults.length > 0) {
            setCheckoutResult({ consumer_name: studentInfo.first_name, messages: combinedResults });
        } else {
            resetCheckout();
        }
      }
      return;
    }

    setIsProcessing(true);
    const wComedor = studentInfo.wallets?.find((w: any) => w.type?.toLowerCase() === 'comedor');
    const comedorItems = cart.filter(item => isComida(item.category));

    try {
      const resp = await processSmartCheckout(
        studentInfo.id,
        selectedPreOrderIds,
        comedorItems,
        {
          comedorTotal,
          snackTotal: 0,
          cartTotal: comedorTotal,
          wComedorId: wComedor ? wComedor.id : null,
          wSnackId: studentInfo.wallets?.find((w: any) => w.type?.toLowerCase() === 'snack')?.id || null,
          fallbackAuthorized: false
        }
      );
      if (resp.error) throw new Error(resp.error);
      
      const newResults = [...combinedResults, ...resp.result.messages];
      setCombinedResults(newResults);
      
      if (snackTotal > 0) {
        setCheckoutPhase('snack');
      } else {
        setCheckoutResult({
          consumer_name: resp.result.consumer_name,
          messages: newResults,
        });
        setCheckoutPhase('success');
        setCart([]); // Clear cart entirely on full success
      }
    } catch (err: any) {
      setErrorMsg(`COMEDOR: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSnackCheckout = async (skip: boolean = false) => {
    if (!studentInfo) return;
    setErrorMsg('');

    if (skip) {
      setCheckoutPhase('success');
      if (combinedResults.length > 0) {
        setCheckoutResult({ consumer_name: studentInfo.first_name, messages: combinedResults });
      } else {
        resetCheckout();
      }
      return;
    }

    setIsProcessing(true);
    const wSnack = studentInfo.wallets?.find((w: any) => w.type?.toLowerCase() === 'snack');
    const snackItems = cart.filter(item => !isComida(item.category));

    try {
      const resp = await processSmartCheckout(
        studentInfo.id,
        [], // Preorders processed in comedor phase
        snackItems,
        {
          comedorTotal: 0,
          snackTotal,
          cartTotal: snackTotal,
          wComedorId: studentInfo.wallets?.find((w: any) => w.type?.toLowerCase() === 'comedor')?.id || null,
          wSnackId: wSnack ? wSnack.id : null,
          fallbackAuthorized: false
        }
      );
      if (resp.error) throw new Error(resp.error);
      
      const newResults = [...combinedResults, ...resp.result.messages];
      setCombinedResults(newResults);
      
      setCheckoutResult({
        consumer_name: resp.result.consumer_name,
        messages: newResults,
      });
      setCheckoutPhase('success');
      setCart([]); // clear cart on full success
    } catch (err: any) {
      setErrorMsg(`SNACK: ${err.message}`);
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
    setCheckoutPhase('scan');
    setCombinedResults([]);
  };

  const togglePreOrder = (id: string) => {
    setSelectedPreOrderIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden">
      
      {/* LEFT PANEL: CART */}
      <div className="w-[350px] bg-white border-r border-slate-200 shadow-xl flex flex-col z-10 relative">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center shadow-md">
          <h2 className="text-xl font-black tracking-widest">SAFELUNCH POS</h2>
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

        <div className="flex-shrink-0 p-6 pb-8 border-t border-slate-100 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.03)] z-20">
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

      {/* CHECKOUT MODALS */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={resetCheckout}></div>
          
          <div className={`relative rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-200 transition-colors ${
            checkoutPhase === 'comedor' ? 'bg-green-600 text-white' : 
            checkoutPhase === 'snack' ? 'bg-purple-600 text-white' :
            'bg-white'
          }`}>
            
            {checkoutPhase === 'scan' && (
              <div className="text-center py-8">
                <div className="h-24 w-24 bg-blue-50 relative rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner overflow-hidden border border-blue-100">
                  <div className="absolute inset-0 border-4 border-primary rounded-[2rem] opacity-50 animate-ping"></div>
                  <span className="text-5xl animate-pulse">💳</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Identificar Alumno</h2>
                <p className="text-slate-500 mb-6 max-w-xs mx-auto">Acerca la pulsera al lector o teclea la matrícula para cobrar <b>${cartTotal.toFixed(2)}</b>.</p>
                
                {errorMsg && (
                  <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-xl mb-4 font-bold text-sm">
                    {errorMsg}
                  </div>
                )}

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

            {checkoutPhase === 'comedor' && studentInfo && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-black mb-1">COMEDOR</h2>
                  <p className="text-green-200 font-bold text-sm">Cobro de Alimentos y Desayunos</p>
                </div>

                <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/20">
                  <div className="h-14 w-14 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black leading-none">{studentInfo.first_name} {studentInfo.last_name}</h3>
                    <p className="text-xs font-bold text-green-200 mt-1 uppercase tracking-widest">{studentInfo.type}</p>
                    {studentInfo.allergies?.length > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-red-300 font-black text-[10px] animate-pulse">
                        <AlertTriangle className="h-3 w-3" /> ALERGIAS: {studentInfo.allergies.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pre-órdenes de Hoy */}
                {studentInfo.todayPreOrders?.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-white/80">
                      <ShoppingBag className="h-4 w-4" />
                      <span className="text-xs font-black uppercase tracking-widest">Pre-órdenes (Comedor)</span>
                    </div>
                    <div className="space-y-2">
                      {studentInfo.todayPreOrders.map((po: any) => (
                        <label 
                          key={po.id} 
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                            selectedPreOrderIds.includes(po.id) 
                              ? 'border-white bg-white/20' 
                              : 'border-white/10 bg-white/5 opacity-60'
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
                              selectedPreOrderIds.includes(po.id) ? 'bg-white border-white text-green-600' : 'border-white/30'
                            }`}>
                              {selectedPreOrderIds.includes(po.id) && <Check className="h-3 w-3" />}
                            </div>
                            <span className="text-sm font-bold">{po.name}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-green-700/50 p-4 rounded-xl border border-green-500/50 flex justify-between items-center shadow-inner">
                   <span className="text-sm font-black uppercase tracking-widest">Total Comedor</span>
                   <span className="text-3xl font-black">${comedorTotal.toFixed(2)}</span>
                </div>

                {errorMsg && (
                  <div className="bg-red-500/20 text-white border border-red-500 p-3 rounded-xl font-bold text-sm text-center">
                    {errorMsg}
                  </div>
                )}

                <div className="pt-2 space-y-3">
                   <button 
                     onClick={() => handleComedorCheckout(false)}
                     disabled={isProcessing || (comedorTotal === 0 && selectedPreOrderIds.length === 0)}
                     className="w-full bg-white text-green-700 font-black text-lg py-4 rounded-xl shadow-xl hover:bg-green-50 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                   >
                     {isProcessing ? 'Procesando...' : 'COBRAR COMEDOR'}
                   </button>
                   
                   <div className="flex justify-between gap-3">
                     <button 
                       onClick={resetCheckout}
                       className="flex-1 bg-green-700 text-white font-bold py-3 rounded-xl hover:bg-green-800 transition text-sm"
                     >
                       Cancelar Todo
                     </button>
                     {snackTotal > 0 && (
                       <button 
                         onClick={() => handleComedorCheckout(true)}
                         className="flex-1 bg-green-500/30 text-white font-bold py-3 rounded-xl hover:bg-green-500/50 transition text-sm flex items-center justify-center gap-1"
                       >
                         Omitir <ArrowRight className="h-4 w-4"/>
                       </button>
                     )}
                   </div>
                </div>
              </div>
            )}

            {checkoutPhase === 'snack' && studentInfo && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-3xl font-black mb-1">SNACKS</h2>
                  <p className="text-purple-200 font-bold text-sm">Cobro de Bebidas y Antojos</p>
                </div>

                <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/20">
                  <div className="h-14 w-14 bg-white/20 rounded-full flex items-center justify-center">
                    <User className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black leading-none">{studentInfo.first_name} {studentInfo.last_name}</h3>
                    <p className="text-xs font-bold text-purple-200 mt-1 uppercase tracking-widest">{studentInfo.type}</p>
                  </div>
                </div>

                <div className="bg-purple-700/50 p-4 rounded-xl border border-purple-500/50 flex justify-between items-center shadow-inner">
                   <span className="text-sm font-black uppercase tracking-widest">Total Snacks</span>
                   <span className="text-3xl font-black">${snackTotal.toFixed(2)}</span>
                </div>

                {errorMsg && (
                  <div className="bg-red-500/20 text-white border border-red-500 p-3 rounded-xl font-bold text-sm text-center">
                    {errorMsg}
                  </div>
                )}

                <div className="pt-2 space-y-3">
                   <button 
                     onClick={() => handleSnackCheckout(false)}
                     disabled={isProcessing || snackTotal === 0}
                     className="w-full bg-white text-purple-700 font-black text-lg py-4 rounded-xl shadow-xl hover:bg-purple-50 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
                   >
                     {isProcessing ? 'Procesando...' : 'COBRAR SNACKS'}
                   </button>
                   
                   <div className="flex justify-between gap-3">
                     <button 
                       onClick={() => handleSnackCheckout(true)}
                       className="flex-1 bg-purple-700 text-white font-bold py-3 rounded-xl hover:bg-purple-800 transition text-sm"
                     >
                       {combinedResults.length > 0 ? 'Omitir y Finalizar' : 'Cancelar Todo'}
                     </button>
                   </div>
                </div>
              </div>
            )}

            {checkoutPhase === 'success' && checkoutResult && (
              <div className="text-center py-6 text-slate-900 bg-white rounded-3xl -m-8 p-8">
                <div className="h-20 w-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">✓</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">¡Operación Finalizada!</h2>
                <p className="text-slate-500 mb-6">Gracias <b>{checkoutResult.consumer_name}</b></p>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6 font-code text-center space-y-2 max-h-48 overflow-y-auto">
                  {checkoutResult.messages?.length > 0 ? (
                    checkoutResult.messages.map((msg: string, i: number) => (
                      <p key={i} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 p-2 rounded-lg">{msg}</p>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Sin mensajes adicionales.</p>
                  )}
                </div>
                <button onClick={resetCheckout} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-slate-800 transition">
                  CERRAR (Siguiente Cliente)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
