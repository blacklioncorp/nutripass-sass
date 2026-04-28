const fs = require('fs');
const file = 'src/components/portal/PreordersClient.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove handleConfirmCheckout and replace with handleRemovePaidItems
content = content.replace(/const handleConfirmCheckout = \(\) => \{[\s\S]*?\}\;\n/g, `const handleRemovePaidItems = useCallback((type: 'comedor' | 'snack') => {
    setCart(prev => prev.filter(i => i.walletType !== type));
  }, []);\n`);

// 2. Replace CheckoutModal invocation
content = content.replace(/\{isCheckoutOpen && \([\s\S]*?<CheckoutModal[\s\S]*?\/>\n      \)\}/g, `{isCheckoutOpen && (
        <CheckoutModal
          cart={cart}
          comedorTotal={comedorTotal}
          snackTotal={snackTotal}
          comedorBalance={parseFloat(String(comedorWallet?.balance ?? 0))}
          snackBalance={parseFloat(String(snackWallet?.balance ?? 0))}
          consumerName={activeConsumer.first_name}
          consumerId={activeConsumer.id}
          schoolLogoUrl={(activeConsumer as any).schools?.logo_url}
          onRemovePaidItems={handleRemovePaidItems}
          onClose={() => setIsCheckoutOpen(false)}
        />
      )}`);

// 3. Replace CheckoutModal definition
const checkoutModalDef = `// ─── Checkout Modal ───────────────────────────────────────────────────────────

function CheckoutModal({
  cart,
  comedorTotal,
  snackTotal,
  comedorBalance,
  snackBalance,
  consumerName,
  consumerId,
  schoolLogoUrl,
  onRemovePaidItems,
  onClose,
}: {
  cart: CartItem[];
  comedorTotal: number;
  snackTotal: number;
  comedorBalance: number;
  snackBalance: number;
  consumerName: string;
  consumerId: string;
  schoolLogoUrl?: string;
  onRemovePaidItems: (type: 'comedor' | 'snack') => void;
  onClose: () => void;
}) {
  const [comedorStatus, setComedorStatus] = useState<'idle'|'processing'|'paid'|'error'>('idle');
  const [snackStatus, setSnackStatus] = useState<'idle'|'processing'|'paid'|'error'>('idle');
  const [comedorError, setComedorError] = useState('');
  const [snackError, setSnackError] = useState('');

  const [paidComedorAmount, setPaidComedorAmount] = useState(0);
  const [paidSnackAmount, setPaidSnackAmount] = useState(0);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPartialSuccess, setIsPartialSuccess] = useState(false);

  const hadComedor = comedorTotal > 0;
  const hadSnack = snackTotal > 0;

  useEffect(() => {
    const comedorDone = !hadComedor || comedorStatus === 'paid';
    const snackDone = !hadSnack || snackStatus === 'paid';
    if ((hadComedor || hadSnack) && comedorDone && snackDone) {
      setShowSuccess(true);
      setIsPartialSuccess(false);
    }
  }, [comedorStatus, snackStatus, hadComedor, hadSnack]);

  const handlePayComedor = async () => {
    setComedorStatus('processing');
    setComedorError('');
    const items = cart.filter(i => i.walletType === 'comedor');
    
    try {
      const result = await createPreOrderTransaction(consumerId, items);
      if (result.error) throw new Error(result.error);
      
      setComedorStatus('paid');
      setPaidComedorAmount(comedorTotal);
      onRemovePaidItems('comedor');
    } catch (e: any) {
      setComedorStatus('error');
      setComedorError(e.message || 'Error al pagar desayunos.');
    }
  };

  const handlePaySnack = async () => {
    setSnackStatus('processing');
    setSnackError('');
    const items = cart.filter(i => i.walletType === 'snack');
    
    try {
      const result = await createPreOrderTransaction(consumerId, items);
      if (result.error) throw new Error(result.error);
      
      setSnackStatus('paid');
      setPaidSnackAmount(snackTotal);
      onRemovePaidItems('snack');
    } catch (e: any) {
      setSnackStatus('error');
      setSnackError(e.message || 'Error al pagar snacks.');
    }
  };

  const handlePartialClose = () => {
    if (comedorStatus === 'paid' || snackStatus === 'paid') {
      setShowSuccess(true);
      setIsPartialSuccess(true);
    } else {
      onClose();
    }
  };

  const insufficientComedor = hadComedor && comedorBalance < comedorTotal;
  const insufficientSnack = hadSnack && snackBalance < snackTotal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#004B87]/60 backdrop-blur-md"
        onClick={showSuccess ? undefined : handlePartialClose}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 overflow-hidden border border-[#e8f0f7] max-h-[90vh] flex flex-col">

        {showSuccess ? (
          <div className="p-10 text-center overflow-y-auto">
            {schoolLogoUrl ? (
              <div className="h-24 flex items-center justify-center mx-auto mb-6">
                <img src={schoolLogoUrl} alt="Colegio" className="h-24 w-auto object-contain drop-shadow-sm" />
              </div>
            ) : (
              <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-emerald-100 ring-offset-4">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>
            )}
            <h2 className="text-3xl font-black text-[#004B87] mb-2">
              {isPartialSuccess ? '¡Confirmación Parcial!' : '¡Orden Confirmada!'}
            </h2>
            <div className="text-[#7CB9E8] font-medium mb-8 space-y-2">
              {isPartialSuccess ? (
                <p>
                  Pagaste 
                  {paidComedorAmount > 0 && <span className="font-black text-[#004B87]"> $\${paidComedorAmount.toFixed(2)} de desayunos</span>}
                  {paidComedorAmount > 0 && paidSnackAmount > 0 && ' y '}
                  {paidSnackAmount > 0 && <span className="font-black text-[#004B87]"> $\${paidSnackAmount.toFixed(2)} de snacks</span>}. 
                  Tus otros artículos siguen en el carrito.
                </p>
              ) : (
                <p>
                  Pagaste 
                  {paidComedorAmount > 0 && <span className="font-black text-[#004B87]"> $\${paidComedorAmount.toFixed(2)} de desayuno</span>}
                  {paidComedorAmount > 0 && paidSnackAmount > 0 && ' y '}
                  {paidSnackAmount > 0 && <span className="font-black text-[#004B87]"> $\${paidSnackAmount.toFixed(2)} de snacks</span>}. 
                  Tu recibo digital ha sido generado.
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-full bg-[#004B87] text-white font-black py-4 rounded-2xl hover:bg-[#003a6b] transition-colors active:scale-95"
            >
              ¡Listo! 🎉
            </button>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-[#004B87] to-[#0063b3] p-6 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">Validación de Pagos</h2>
                  <p className="text-blue-300 text-sm mt-0.5">Para: <span className="font-black text-white">{consumerName}</span></p>
                </div>
                <button onClick={handlePartialClose} className="text-blue-300 hover:text-white transition p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Sección Superior (Verde): COMEDOR */}
              {hadComedor && (
                <div className="bg-green-600/10 border-2 border-green-500/20 rounded-3xl p-5 space-y-4 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-green-800 text-lg">Pago de Desayunos</h3>
                      <p className="text-green-700/70 text-xs font-bold uppercase tracking-widest mt-1">Billetera Comedor</p>
                    </div>
                    <span className="text-3xl font-black text-green-700">$\${comedorTotal.toFixed(2)}</span>
                  </div>

                  {comedorStatus === 'error' && (
                    <div className="bg-white/60 border border-red-300 text-red-700 text-xs font-bold p-3 rounded-xl flex gap-2">
                       <AlertCircle className="h-4 w-4 flex-shrink-0" />
                       <p>{comedorError}</p>
                    </div>
                  )}

                  {insufficientComedor && comedorStatus !== 'paid' && (
                    <div className="bg-white/60 border border-red-300 text-red-700 text-xs font-bold p-3 rounded-xl flex gap-2">
                       <AlertCircle className="h-4 w-4 flex-shrink-0" />
                       <p>Saldo insuficiente en Billetera Comedor ($\${comedorBalance.toFixed(2)} disponibles).</p>
                    </div>
                  )}

                  {comedorStatus === 'paid' ? (
                     <div className="w-full bg-white/50 text-green-700 font-black text-lg py-3 rounded-2xl flex items-center justify-center gap-2 border-2 border-green-500">
                        <CheckCircle2 className="h-5 w-5" /> PAGADO ✅
                     </div>
                  ) : (
                     <button
                        onClick={handlePayComedor}
                        disabled={comedorStatus === 'processing' || insufficientComedor}
                        className="w-full bg-green-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:bg-green-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                     >
                        {comedorStatus === 'processing' ? <Loader2 className="h-5 w-5 animate-spin"/> : 'Pagar Desayunos'}
                     </button>
                  )}
                </div>
              )}

              {/* Sección Inferior (Morado): SNACKS */}
              {hadSnack && (
                <div className="bg-purple-600/10 border-2 border-purple-500/20 rounded-3xl p-5 space-y-4 relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-purple-800 text-lg">Pago de Snacks y Bebidas</h3>
                      <p className="text-purple-700/70 text-xs font-bold uppercase tracking-widest mt-1">Billetera Snacks</p>
                    </div>
                    <span className="text-3xl font-black text-purple-700">$\${snackTotal.toFixed(2)}</span>
                  </div>

                  {snackStatus === 'error' && (
                     <div className="bg-white/60 border border-red-300 text-red-700 text-xs font-bold p-3 rounded-xl flex gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <p>{snackError}</p>
                     </div>
                  )}

                  {insufficientSnack && snackStatus !== 'paid' && (
                     <div className="bg-white/60 border border-red-300 text-red-700 text-xs font-bold p-3 rounded-xl flex gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <p>Saldo insuficiente en Billetera Snack ($\${snackBalance.toFixed(2)} disponibles).</p>
                     </div>
                  )}

                  {snackStatus === 'paid' ? (
                     <div className="w-full bg-white/50 text-purple-700 font-black text-lg py-3 rounded-2xl flex items-center justify-center gap-2 border-2 border-purple-500">
                        <CheckCircle2 className="h-5 w-5" /> PAGADO ✅
                     </div>
                  ) : (
                     <button
                        onClick={handlePaySnack}
                        disabled={snackStatus === 'processing' || insufficientSnack}
                        className="w-full bg-purple-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:bg-purple-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                     >
                        {snackStatus === 'processing' ? <Loader2 className="h-5 w-5 animate-spin"/> : 'Pagar Snacks'}
                     </button>
                  )}
                </div>
              )}

            </div>

            <div className="p-6 pt-0 mt-auto flex-shrink-0">
               <button
                  onClick={handlePartialClose}
                  className="w-full border-2 border-slate-200 text-slate-500 font-bold py-3.5 rounded-2xl hover:bg-slate-50 transition-colors"
               >
                  {comedorStatus === 'paid' || snackStatus === 'paid' ? 'Finalizar Orden Parcial' : 'Cancelar y Cerrar'}
               </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}`;

content = content.replace(/\/\/ ─── Checkout Modal ────────[\s\S]*$/, checkoutModalDef);

fs.writeFileSync(file, content);
