
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Barcode, Plus, Package, Search, Loader2, CheckCircle2 } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

export default function StockManager() {
  const db = useFirestore();
  const schoolId = 'sch1';
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundProduct, setFoundProduct] = useState<any>(null);
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const scannerRef = useRef<HTMLInputElement>(null);

  // Keep scanner input focused
  useEffect(() => {
    const focusScanner = () => scannerRef.current?.focus();
    focusScanner();
    const interval = setInterval(focusScanner, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;

    setIsSearching(true);
    setFoundProduct(null);

    try {
      const q = query(
        collection(db, 'schools', schoolId, 'products'),
        where('barcode', '==', barcodeInput),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast({
          title: "Producto no encontrado",
          description: `El código ${barcodeInput} no está registrado.`,
          variant: "destructive"
        });
      } else {
        const product = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
        setFoundProduct(product);
        toast({
          title: "Producto detectado",
          description: product.name,
        });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Ocurrió un error al buscar el producto.", variant: "destructive" });
    } finally {
      setIsSearching(false);
      setBarcodeInput('');
    }
  };

  const updateStock = async () => {
    if (!foundProduct || addQuantity <= 0) return;

    try {
      const productRef = doc(db, 'schools', schoolId, 'products', foundProduct.id);
      await updateDoc(productRef, {
        stockQuantity: increment(addQuantity)
      });
      
      toast({
        title: "Stock actualizado",
        description: `Se añadieron ${addQuantity} unidades a ${foundProduct.name}.`,
      });
      
      setFoundProduct(null);
      setAddQuantity(1);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el inventario.", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="space-y-2">
        <h1 className="text-3xl font-black flex items-center gap-3">
          <Barcode className="h-8 w-8 text-primary" />
          Ingreso Rápido de Inventario
        </h1>
        <p className="text-muted-foreground font-medium">Escanea el código de barras del producto para actualizar existencias.</p>
      </header>

      <form onSubmit={handleBarcodeSubmit} className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          {isSearching ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Barcode className="h-6 w-6 text-muted-foreground" />}
        </div>
        <Input
          ref={scannerRef}
          value={barcodeInput}
          onChange={(e) => setBarcodeInput(e.target.value)}
          placeholder="Esperando escaneo de código de barras..."
          className="h-20 pl-14 text-2xl font-mono tracking-widest border-4 border-primary/20 focus-visible:ring-primary rounded-2xl bg-white shadow-inner"
          autoFocus
        />
        <Button type="submit" className="hidden">Buscar</Button>
      </form>

      {foundProduct && (
        <Card className="border-4 border-primary/20 bg-white shadow-2xl rounded-3xl overflow-hidden animate-in slide-in-from-bottom-4">
          <CardHeader className="bg-primary/5 p-8 border-b border-primary/10">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-black px-3 py-1">
                  {foundProduct.category.toUpperCase()}
                </Badge>
                <CardTitle className="text-4xl font-black tracking-tight">{foundProduct.name}</CardTitle>
                <CardDescription className="text-lg font-medium">{foundProduct.description}</CardDescription>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Existencia Actual</p>
                <p className="text-5xl font-black text-primary">{foundProduct.stockQuantity || 0}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
              <div className="space-y-3">
                <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Cantidad a Ingresar</Label>
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline" 
                    className="h-16 w-16 rounded-2xl text-2xl font-black border-2" 
                    onClick={() => setAddQuantity(Math.max(1, addQuantity - 1))}
                  >-</Button>
                  <Input 
                    type="number" 
                    value={addQuantity} 
                    onChange={(e) => setAddQuantity(parseInt(e.target.value) || 0)}
                    className="h-16 text-center text-3xl font-black rounded-2xl border-2 border-primary/20"
                  />
                  <Button 
                    variant="outline" 
                    className="h-16 w-16 rounded-2xl text-2xl font-black border-2" 
                    onClick={() => setAddQuantity(addQuantity + 1)}
                  >+</Button>
                </div>
              </div>
              <Button 
                onClick={updateStock}
                className="h-16 bg-primary text-foreground hover:bg-primary/90 font-black text-xl rounded-2xl shadow-xl gap-3"
              >
                <CheckCircle2 className="h-6 w-6" />
                ACTUALIZAR INVENTARIO
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!foundProduct && !isSearching && (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground space-y-4">
          <Package className="h-20 w-20 opacity-20" />
          <p className="font-bold text-lg">Listo para procesar entrada de mercancía</p>
          <p className="text-sm">Escanea cualquier producto para empezar.</p>
        </div>
      )}
    </div>
  );
}
