
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  AlertCircle, 
  ShoppingCart, 
  User, 
  Wifi, 
  Zap, 
  Percent, 
  Trash2, 
  ArrowRight, 
  CreditCard,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldAlert
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  runTransaction, 
  serverTimestamp,
  limit,
  addDoc
} from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function POSScanner() {
  const db = useFirestore();
  const schoolId = 'sch1';
  
  // States
  const [nfcInput, setNfcInput] = useState('');
  const [currentMember, setCurrentMember] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'ready' | 'processing' | 'success' | 'error'>('idle');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Load School Config for Discounts
  const [schoolConfig, setSchoolConfig] = useState<any>(null);
  useEffect(() => {
    const fetchConfig = async () => {
      const q = query(collection(db, 'schools'), where('id', '==', schoolId), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) setSchoolConfig(snap.docs[0].data());
    };
    fetchConfig();
  }, [db, schoolId]);

  // Load Catalog
  const productsQuery = useMemoFirebase(() => collection(db, 'schools', schoolId, 'products'), [db, schoolId]);
  const { data: products } = useCollection(productsQuery);

  // Keep scanner focused
  useEffect(() => {
    const focusScanner = () => {
      if (!showCheckoutModal) inputRef.current?.focus();
    };
    focusScanner();
    const interval = setInterval(focusScanner, 2000);
    return () => clearInterval(interval);
  }, [showCheckoutModal]);

  const handleNfcScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nfcInput) return;

    if (showCheckoutModal) {
      processTransaction(nfcInput);
      setNfcInput('');
      return;
    }

    setStatus('scanning');
    try {
      const q = query(
        collection(db, 'schools', schoolId, 'members'),
        where('nfcTagUid', '==', nfcInput),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        toast({ title: "Tag no reconocido", variant: "destructive" });
        setStatus('idle');
      } else {
        const member = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
        setCurrentMember(member);
        setStatus('ready');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
    setNfcInput('');
  };

  const processTransaction = async (tagUid: string) => {
    if (cart.length === 0 || isProcessingSale) return;
    setIsProcessingSale(true);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Re-verify member
        const memberQuery = query(
          collection(db, 'schools', schoolId, 'members'),
          where('nfcTagUid', '==', tagUid),
          limit(1)
        );
        const memberSnap = await getDocs(memberQuery);
        if (memberSnap.empty) throw new Error("Tag no válido");
        
        const memberDoc = memberSnap.docs[0];
        const member = memberDoc.data();
        const memberId = memberDoc.id;
        const parentId = member.profileId || "parent1";

        // 2. Apply Discounts & Calculate Points
        const discountPercent = (member.userType === 'staff' && schoolConfig?.staffDiscountActive) 
          ? (schoolConfig?.staffDiscountPercentage || 0) 
          : 0;
        const subtotal = cart.reduce((acc, curr) => acc + curr.price, 0);
        const discount = subtotal * (discountPercent / 100);
        const finalTotal = subtotal - discount;
        const earnedPoints = cart.reduce((acc, curr) => acc + (curr.nutriPointsReward || 0), 0);

        // 3. Find Wallet & Check Emergency Fund
        const walletRef = doc(db, 'schools', schoolId, 'members', memberId, 'wallets', 'w1');
        const walletSnap = await transaction.get(walletRef);
        
        if (!walletSnap.exists()) throw new Error("Billetera no configurada");
        const balance = walletSnap.data().balance;
        const maxOverdraft = member.maxOverdraft || 50;

        // EMERGENCY FUND LOGIC
        if (balance + maxOverdraft < finalTotal) {
          throw new Error(`Saldo insuficiente. Límite de emergencia excedido.`);
        }

        const newBalance = balance - finalTotal;

        // 4. Updates
        transaction.update(walletRef, { balance: newBalance });
        
        // Update Nutri-Points
        transaction.update(doc(db, 'schools', schoolId, 'members', memberId), {
          earnedNutriPoints: (member.earnedNutriPoints || 0) + earnedPoints
        });

        for (const item of cart) {
          if (item.category !== 'comedor') {
            const prodRef = doc(db, 'schools', schoolId, 'products', item.id);
            transaction.update(prodRef, { stockQuantity: (item.stockQuantity || 0) - 1 });
          }
        }

        // Add Transaction Record
        const txId = doc(collection(db, 'transactions')).id;
        transaction.set(doc(db, 'schools', schoolId, 'transactions', txId), {
          id: txId,
          memberId,
          memberName: `${member.firstName} ${member.lastName}`,
          amount: finalTotal,
          pointsEarned: earnedPoints,
          items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, points: i.nutriPointsReward })),
          timestamp: serverTimestamp(),
          type: 'purchase',
          isOverdraft: newBalance < 0
        });

        // 5. Create Notification
        const notificationId = doc(collection(db, 'profiles', parentId, 'notifications')).id;
        let msg = `${member.firstName} compró: ${cart.map(i => i.name).join(', ')}. Total: $${finalTotal.toFixed(2)}.`;
        let notificationType = "purchase";

        if (newBalance < 0) {
          msg += ` ¡ATENCIÓN! Se utilizó el FONDO DE EMERGENCIA. Saldo: $${newBalance.toFixed(2)}. Favor de recargar.`;
          notificationType = "emergency_fund";
        } else {
          msg += ` Saldo restante: $${newBalance.toFixed(2)}.`;
        }

        transaction.set(doc(db, 'profiles', parentId, 'notifications', notificationId), {
          id: notificationId,
          userId: parentId,
          title: newBalance < 0 ? "⚠️ ALERTA: FONDO DE EMERGENCIA" : "NutriPass: Compra Realizada",
          message: msg,
          type: notificationType,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      });

      setStatus('success');
      toast({ title: "Pago procesado", description: "Venta finalizada con éxito." });
      resetSession();
    } catch (e: any) {
      toast({ title: "Error en transacción", description: e.message, variant: "destructive" });
    } finally {
      setIsProcessingSale(false);
      setShowCheckoutModal(false);
    }
  };

  const addToCart = (product: any) => {
    if (product.category !== 'comedor' && (product.stockQuantity || 0) <= 0) {
      toast({ title: "Sin Stock", description: "Producto agotado.", variant: "destructive" });
      return;
    }
    setCart([...cart, product]);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const rawTotal = cart.reduce((acc, curr) => acc + curr.price, 0);
  const totalPoints = cart.reduce((acc, curr) => acc + (curr.nutriPointsReward || 0), 0);
  const isStaff = currentMember?.userType === 'staff';
  const discountAmount = isStaff ? (rawTotal * ((schoolConfig?.staffDiscountPercentage || 0) / 100)) : 0;
  const finalTotal = rawTotal - discountAmount;

  const resetSession = () => {
    setCurrentMember(null);
    setCart([]);
    setStatus('idle');
    setShowCheckoutModal(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
      <form onSubmit={handleNfcScan} className="absolute opacity-0 -z-50">
        <input 
          ref={inputRef} 
          value={nfcInput} 
          onChange={(e) => setNfcInput(e.target.value)} 
          autoFocus 
        />
      </form>

      {/* Left: Cart Area */}
      <aside className="w-96 bg-white border-r flex flex-col shadow-xl">
        <CardHeader className="border-b bg-muted/20 py-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-black">
              <ShoppingCart className="h-6 w-6 text-primary" />
              ORDEN ACTUAL
            </CardTitle>
            <Badge variant="outline" className="font-mono">{cart.length} ITEMS</Badge>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 gap-4">
              <ShoppingCart className="h-20 w-20" />
              <p className="font-bold uppercase tracking-widest text-xs">Carrito Vacío</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border-2 border-transparent hover:border-primary/20 transition-all group">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-black text-sm uppercase truncate">{item.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">{item.category}</p>
                    {item.nutriPointsReward > 0 && (
                      <Badge variant="outline" className="text-[8px] h-4 bg-amber-50 text-amber-600 border-amber-100">
                        +{item.nutriPointsReward} pts
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-black text-primary">${item.price.toFixed(2)}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFromCart(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>

        <CardFooter className="p-6 border-t bg-slate-900 text-white flex-col gap-4">
          <div className="w-full space-y-2">
            <div className="flex justify-between items-center text-amber-400 text-xs font-black uppercase tracking-widest">
              <span>Nutri-Puntos Ganados</span>
              <span>{totalPoints} pts</span>
            </div>
            {isStaff && (
              <div className="flex justify-between items-center text-emerald-400 text-xs font-black uppercase tracking-widest">
                <span>Descuento Staff ({schoolConfig?.staffDiscountPercentage}%)</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-end">
              <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Total</span>
              <span className="text-5xl font-mono font-black text-primary tracking-tighter">${finalTotal.toFixed(2)}</span>
            </div>
          </div>
          <Button 
            className="w-full h-20 bg-primary text-foreground hover:bg-primary/90 font-black text-2xl rounded-2xl shadow-2xl gap-3 transition-transform active:scale-95 disabled:opacity-50"
            disabled={cart.length === 0 || !currentMember}
            onClick={() => setShowCheckoutModal(true)}
          >
            PAGAR AHORA
            <ArrowRight className="h-6 w-6" />
          </Button>
        </CardFooter>
      </aside>

      {/* Main Content: Catalog */}
      <main className="flex-1 p-8 overflow-y-auto">
        {status === 'idle' ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
            <div className="relative">
              <div className="h-40 w-40 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <User className="h-20 w-20 text-primary" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-secondary p-3 rounded-2xl shadow-xl">
                <Zap className="h-6 w-6 text-foreground" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-4xl font-black tracking-tight">Identificar Cliente</h2>
              <p className="text-muted-foreground font-medium text-lg">Acerque la tarjeta o el tag NFC al lector para iniciar la venta.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center font-black text-2xl shadow-lg border-4 border-white">
                  {currentMember?.firstName[0]}{currentMember?.lastName[0]}
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tight">{currentMember?.firstName} {currentMember?.lastName}</h2>
                  <div className="flex gap-4 mt-1">
                    <Badge variant={isStaff ? "secondary" : "default"} className="font-black">
                      {isStaff ? "PERSONAL" : "ESTUDIANTE"}
                    </Badge>
                    <span className="text-sm font-bold text-muted-foreground uppercase">{currentMember?.identifier}</span>
                    <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 font-black">
                      {currentMember?.earnedNutriPoints || 0} PTS ACUMULADOS
                    </Badge>
                  </div>
                </div>
              </div>
              <Button variant="ghost" className="font-bold text-destructive hover:bg-destructive/10" onClick={resetSession}>CERRAR SESIÓN</Button>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
              {products?.map(product => {
                const isOutOfStock = product.category !== 'comedor' && (product.stockQuantity || 0) <= 0;
                return (
                  <button
                    key={product.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(product)}
                    className={cn(
                      "group relative flex flex-col p-6 bg-white rounded-[2rem] border-4 transition-all text-left shadow-lg overflow-hidden",
                      isOutOfStock ? "opacity-50 grayscale cursor-not-allowed border-transparent" : "hover:border-primary active:scale-95 border-primary/5"
                    )}
                  >
                    <div className="flex-1 space-y-3">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className="bg-slate-50 text-[10px] font-black">{product.category.toUpperCase()}</Badge>
                        {product.nutriPointsReward > 0 && (
                          <div className="flex items-center gap-1 text-amber-500 font-black text-[10px]">
                            <Zap className="h-3 w-3 fill-amber-500" />
                            +{product.nutriPointsReward}
                          </div>
                        )}
                      </div>
                      <h3 className="font-black text-lg leading-tight uppercase group-hover:text-primary transition-colors">{product.name}</h3>
                      <p className="text-xs text-muted-foreground font-medium line-clamp-2">{product.description}</p>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <span className="text-2xl font-mono font-black text-slate-900">${product.price.toFixed(2)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Checkout Modal */}
      <Dialog open={showCheckoutModal} onOpenChange={setShowCheckoutModal}>
        <DialogContent className="sm:max-w-[450px] text-center rounded-[3rem] p-12 border-none shadow-2xl">
          <DialogHeader className="items-center gap-6">
            <div className="h-40 w-40 rounded-full bg-slate-900 flex items-center justify-center relative shadow-2xl">
              <CreditCard className="h-20 w-20 text-primary animate-bounce" />
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <DialogTitle className="text-3xl font-black uppercase tracking-tight">Confirmar Cobro</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <p className="text-muted-foreground font-medium">
              Esperando lectura del Tag NFC para autorizar el cargo de <span className="font-black text-foreground text-xl">${finalTotal.toFixed(2)}</span>.
            </p>
            <div className="flex items-center justify-center gap-2 text-amber-500 bg-amber-50 p-3 rounded-2xl border border-amber-100">
              <ShieldAlert className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-tight">Fondo de Emergencia Disponible</span>
            </div>
          </div>
          <Button variant="ghost" className="font-bold text-muted-foreground" onClick={() => setShowCheckoutModal(false)}>CANCELAR OPERACIÓN</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
