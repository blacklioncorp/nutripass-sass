"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, ShoppingCart, User, Wifi, Zap } from 'lucide-react';
import { supabase, mockWallets, mockProducts } from '@/lib/supabase';
import { generateAllergySafeMealSuggestions } from '@/ai/flows/generate-allergy-safe-meal-suggestions';

export default function POSScanner() {
  const [nfcInput, setNfcInput] = useState('');
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [wallets, setWallets] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'ready' | 'error'>('idle');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the hidden input continuously for NFC reader emulation
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
      // Simulate Supabase fetch
      const { data: student, error } = await supabase.from('students').select('*').eq('nfc_tag_uid', nfcInput).single();
      
      if (error || !student) {
        setStatus('error');
        setNfcInput('');
        return;
      }

      // Fetch wallets
      const studentWallets = mockWallets.filter(w => w.student_id === student.id);
      
      setCurrentStudent(student);
      setWallets(studentWallets);
      setStatus('ready');
      setNfcInput('');

      // Trigger AI Allergy Check if they have allergies
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

  const total = cart.reduce((acc, curr) => acc + curr.price, 0);

  const resetSession = () => {
    setCurrentStudent(null);
    setWallets([]);
    setCart([]);
    setStatus('idle');
    setAiSuggestions([]);
  };

  const processPayment = () => {
    // In a real app, this would perform a Supabase transaction
    alert(`Cobro de $${total} procesado para ${currentStudent.full_name}`);
    resetSession();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 max-w-7xl mx-auto min-h-[calc(100svh-8rem)]">
      {/* Hidden NFC Listener */}
      <form onSubmit={handleNfcSubmit} className="absolute opacity-0 -z-50">
        <input
          ref={inputRef}
          value={nfcInput}
          onChange={(e) => setNfcInput(e.target.value)}
          autoFocus
        />
      </form>

      {/* Main Checkout Area */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-2 border-primary/20 shadow-xl overflow-hidden">
          <CardHeader className="bg-primary/10 flex flex-row items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-foreground" />
              <CardTitle className="text-xl">Punto de Venta Tablet</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">En Línea</span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {status === 'idle' && (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="bg-muted p-8 rounded-full animate-pulse">
                  <User className="h-16 w-16 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold">Esperando Estudiante...</h3>
                <p className="text-muted-foreground">Escanea el tag NFC para comenzar la transacción</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setNfcInput('12345'); /* trigger manually for demo */ }}>Simular Tag 12345</Button>
                  <Button variant="outline" onClick={() => { setNfcInput('67890'); }}>Simular Tag 67890</Button>
                </div>
              </div>
            )}

            {status === 'ready' && currentStudent && (
              <div className="space-y-6">
                <div className="flex items-start justify-between bg-white p-4 rounded-xl border-2 border-primary shadow-sm">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-foreground">{currentStudent.full_name}</h3>
                    <div className="flex gap-4">
                      {wallets.map(w => (
                        <div key={w.id} className="flex flex-col">
                          <span className="text-xs uppercase text-muted-foreground font-bold">{w.type}</span>
                          <span className="text-lg font-mono font-bold text-foreground">${w.balance.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={currentStudent.allergies.length > 0 ? "destructive" : "secondary"} className="mb-2">
                      {currentStudent.allergies.length > 0 ? `${currentStudent.allergies.length} Alergias` : "Sin Alergias"}
                    </Badge>
                  </div>
                </div>

                {/* AI Allergy Alert */}
                {currentStudent.allergies.length > 0 && (
                  <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 font-bold">
                      <AlertCircle className="h-5 w-5" />
                      <h4>Protocolo de Seguridad Alimentaria</h4>
                    </div>
                    <p className="text-sm text-amber-800">
                      Este alumno tiene alergias a: <span className="font-bold">{currentStudent.allergies.join(', ')}</span>.
                    </p>
                    {isLoadingAi ? (
                      <div className="h-8 bg-amber-100 animate-pulse rounded" />
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-amber-900 font-semibold uppercase">Sugerencias de la IA:</p>
                        <ul className="text-sm list-disc list-inside text-amber-900">
                          {aiSuggestions.map((s, idx) => <li key={idx}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {mockProducts.map(product => (
                    <Button
                      key={product.id}
                      variant="outline"
                      className="h-24 flex flex-col items-center justify-center gap-1 border-2 hover:border-primary hover:bg-primary/5 transition-all"
                      onClick={() => addToCart(product)}
                    >
                      <span className="font-bold text-sm text-center line-clamp-2">{product.name}</span>
                      <span className="text-primary font-mono font-bold">${product.price.toFixed(2)}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cart Sidebar */}
      <div className="space-y-6">
        <Card className="h-full flex flex-col shadow-xl">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Tu Carrito
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground italic">El carrito está vacío</div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="font-mono font-bold">${item.price.toFixed(2)}</span>
                </div>
              ))
            )}
          </CardContent>
          <CardFooter className="flex-col gap-4 border-t p-6">
            <div className="flex justify-between w-full">
              <span className="text-lg font-bold">TOTAL</span>
              <span className="text-3xl font-mono font-black text-foreground">${total.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-1 w-full gap-2">
              <Button 
                size="lg" 
                className="w-full bg-secondary text-foreground hover:bg-secondary/90 font-bold text-lg h-16 shadow-lg"
                disabled={!currentStudent || total === 0}
                onClick={processPayment}
              >
                PAGAR AHORA
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-destructive hover:bg-destructive/10"
                onClick={resetSession}
              >
                CANCELAR / LIMPIAR
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}