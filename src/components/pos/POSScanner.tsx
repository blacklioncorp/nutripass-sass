
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ShoppingCart, User, Wifi, Zap, Percent } from 'lucide-react';
import { supabase, mockWallets, mockProducts } from '@/lib/supabase';
import { generateAllergySafeMealSuggestions } from '@/ai/flows/generate-allergy-safe-meal-suggestions';

// LÓGICA DE NEGOCIO: Aplicación de descuento para Staff
const STAFF_DISCOUNT_PERCENT = 15; // Podría venir de firestore/schools/{schoolId}

export default function POSScanner() {
  const [nfcInput, setNfcInput] = useState('');
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'ready' | 'error'>('idle');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.activeElement?.tagName !== 'INPUT') {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNfcSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nfcInput) return;

    setStatus('scanning');
    try {
      const { data: student, error } = await supabase.from('students').select('*').eq('nfc_tag_uid', nfcInput).single();
      
      if (error || !student) {
        setStatus('error');
        setNfcInput('');
        return;
      }

      const studentWallets = mockWallets.filter(w => w.student_id === student.id);
      
      // Simulación de tipo de usuario para demo
      const userType = nfcInput === '67890' ? 'staff' : 'student';
      
      setCurrentStudent({ ...student, userType });
      setWallets(studentWallets);
      setStatus('ready');
      setNfcInput('');

      if (student.allergies?.length > 0) {
        setIsLoadingAi(true);
        const menuString = mockProducts.map(p => `${p.name}: ${p.ingredients.join(', ')}`).join('\n');
        const res = await generateAllergySafeMealSuggestions({
          dietaryRestrictions: student.allergies,
          dailyMenu: menuString,
          studentName: student.full_name
        });
        setAiSuggestions(res.suggestions);
        setIsLoadingAi(false);
      }
    } catch (err) {
      setStatus('error');
    }
  };

  const addToCart = (product: any) => {
    setCart([...cart, product]);
  };

  const rawTotal = cart.reduce((acc, curr) => acc + curr.price, 0);
  const isStaff = currentStudent?.userType === 'staff';
  const discountAmount = isStaff ? (rawTotal * (STAFF_DISCOUNT_PERCENT / 100)) : 0;
  const finalTotal = rawTotal - discountAmount;

  const resetSession = () => {
    setCurrentStudent(null);
    setWallets([]);
    setCart([]);
    setStatus('idle');
    setAiSuggestions([]);
  };

  const processPayment = () => {
    alert(`Cobro de $${finalTotal.toFixed(2)} ${isStaff ? '(Con desc. Staff)' : ''} procesado para ${currentStudent.full_name}`);
    resetSession();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 max-w-7xl mx-auto min-h-[calc(100svh-8rem)]">
      <form onSubmit={handleNfcSubmit} className="absolute opacity-0 -z-50">
        <input ref={inputRef} value={nfcInput} onChange={(e) => setNfcInput(e.target.value)} autoFocus />
      </form>

      <div className="lg:col-span-2 space-y-6">
        <Card className="border-2 border-primary/20 shadow-xl overflow-hidden bg-white">
          <CardHeader className="bg-primary/10 flex flex-row items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-foreground" />
              <CardTitle className="text-xl font-black">NutriPass POS</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Conectado</span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {status === 'idle' && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="bg-muted p-8 rounded-full animate-pulse">
                  <User className="h-16 w-16 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-black">Acerque el Tag NFC</h3>
                <p className="text-muted-foreground text-sm">Escanee el carnet del alumno o empleado</p>
                <div className="flex gap-2">
                  <Button variant="outline" className="text-xs font-bold" onClick={() => { setNfcInput('12345'); }}>Demo Alumno</Button>
                  <Button variant="outline" className="text-xs font-bold" onClick={() => { setNfcInput('67890'); }}>Demo Staff (-15%)</Button>
                </div>
              </div>
            )}

            {status === 'ready' && currentStudent && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-start justify-between bg-white p-5 rounded-2xl border-2 border-primary shadow-sm relative overflow-hidden">
                  {isStaff && (
                    <div className="absolute top-0 right-0 bg-secondary px-3 py-1 rounded-bl-xl font-black text-[10px] flex items-center gap-1">
                      <Percent className="h-3 w-3" /> STAFF DISCOUNT
                    </div>
                  )}
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-foreground">{currentStudent.full_name}</h3>
                    <div className="flex gap-6">
                      {wallets.map(w => (
                        <div key={w.id} className="flex flex-col">
                          <span className="text-[10px] uppercase text-muted-foreground font-black tracking-widest">{w.type}</span>
                          <span className="text-xl font-mono font-black text-foreground">${w.balance.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={isStaff ? "secondary" : "default"} className="font-black">
                      {isStaff ? "EMPLEADO" : "ESTUDIANTE"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {mockProducts.map(product => (
                    <Button
                      key={product.id}
                      variant="outline"
                      className="h-28 flex flex-col items-center justify-center gap-1 border-2 border-primary/10 hover:border-primary hover:bg-primary/5 transition-all group"
                      onClick={() => addToCart(product)}
                    >
                      <span className="font-bold text-sm text-center px-2">{product.name}</span>
                      <span className="text-primary font-mono font-black text-lg">${product.price.toFixed(2)}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="h-full flex flex-col shadow-xl border-2 border-primary/5 bg-white">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="flex items-center gap-2 text-lg font-black">
              <ShoppingCart className="h-5 w-5" />
              CARRITO
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
            {cart.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground text-sm italic font-medium">No hay productos seleccionados</div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-muted/30 rounded-xl border border-muted animate-in slide-in-from-right-2">
                  <span className="text-sm font-bold">{item.name}</span>
                  <span className="font-mono font-black text-primary">${item.price.toFixed(2)}</span>
                </div>
              ))
            )}
          </CardContent>
          <CardFooter className="flex-col gap-3 border-t p-6 bg-muted/10">
            <div className="space-y-1 w-full">
              {isStaff && cart.length > 0 && (
                <div className="flex justify-between text-emerald-600 text-xs font-black uppercase">
                  <span>Descuento Staff (15%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between w-full items-end pt-2">
                <span className="text-xs font-black uppercase text-muted-foreground">TOTAL A PAGAR</span>
                <span className="text-4xl font-mono font-black text-foreground tracking-tighter">${finalTotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 w-full gap-2 mt-4">
              <Button 
                size="lg" 
                className="w-full bg-secondary text-foreground hover:bg-secondary/90 font-black text-xl h-16 shadow-lg rounded-2xl"
                disabled={!currentStudent || cart.length === 0}
                onClick={processPayment}
              >
                CONFIRMAR PAGO
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-muted-foreground font-bold hover:text-destructive"
                onClick={resetSession}
              >
                LIMPIAR SESIÓN
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
