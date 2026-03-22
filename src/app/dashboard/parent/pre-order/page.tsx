
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ShoppingCart, CheckCircle, Wallet, AlertCircle } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, setDoc, updateDoc, increment } from 'firebase/firestore';
import { format, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

export default function WeeklyPreOrder() {
  const db = useFirestore();
  const schoolId = 'sch1';
  const memberId = 's1'; // Mock current child/member
  const walletId = 'w1'; // Mock wallet

  const startOfNextWeek = startOfWeek(addDays(new Date(), 7), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(startOfNextWeek, i));

  const menusQuery = useMemoFirebase(() => 
    collection(db, 'schools', schoolId, 'menus'), 
    [db, schoolId]
  );
  const { data: menus } = useCollection(menusQuery);

  const [selectedMenus, setSelectedMenus] = useState<any[]>([]);
  const totalPrice = selectedMenus.reduce((acc, curr) => acc + curr.price, 0);

  const toggleSelection = (menu: any) => {
    if (selectedMenus.find(m => m.id === menu.id)) {
      setSelectedMenus(selectedMenus.filter(m => m.id !== menu.id));
    } else {
      setSelectedMenus([...selectedMenus, menu]);
    }
  };

  const handleCheckout = async () => {
    if (selectedMenus.length === 0) return;

    // Simulate transactional payment
    try {
      // 1. Create PreOrders
      selectedMenus.forEach(menu => {
        const orderId = doc(collection(db, 'schools', schoolId, 'preOrders')).id;
        setDoc(doc(db, 'schools', schoolId, 'preOrders', orderId), {
          id: orderId,
          schoolId,
          memberId,
          menuId: menu.id,
          productId: menu.productId,
          productName: menu.productName,
          date: menu.date,
          status: 'paid',
          totalPrice: menu.price,
          createdAt: new Date().toISOString()
        });
      });

      // 2. Discount Wallet (Mocking decrementing balance)
      updateDoc(doc(db, 'schools', schoolId, 'members', memberId, 'wallets', walletId), {
        balance: increment(-totalPrice)
      });

      toast({ 
        title: "¡Reserva Exitosa!", 
        description: `Has reservado ${selectedMenus.length} comidas por $${totalPrice.toFixed(2)}.` 
      });
      setSelectedMenus([]);
    } catch (e) {
      toast({ variant: 'destructive', title: "Error en el pago", description: "No se pudo procesar la reserva." });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            Reserva de Comidas
          </h1>
          <p className="text-muted-foreground font-medium">Planifica la alimentación de la próxima semana y evita filas.</p>
        </div>
        <Card className="bg-white border-2 border-primary/20 shadow-sm p-4 flex items-center gap-4">
          <Wallet className="h-6 w-6 text-primary" />
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground">Saldo Disponible</p>
            <p className="text-xl font-black">$450.00</p>
          </div>
        </Card>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {weekDays.map((day) => {
          const dayMenu = menus?.find(m => m.date === format(day, 'yyyy-MM-dd'));
          const isSelected = dayMenu && selectedMenus.find(m => m.id === dayMenu.id);

          return (
            <Card 
              key={day.toString()} 
              className={`transition-all border-2 ${isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-primary/10 bg-white hover:border-primary/30'}`}
              onClick={() => dayMenu && toggleSelection(dayMenu)}
            >
              <CardHeader className="p-4 border-b">
                <CardTitle className="text-sm font-black uppercase text-center">
                  {format(day, 'EEEE dd', { locale: es })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 flex flex-col items-center justify-center min-h-[150px] space-y-4 text-center">
                {dayMenu ? (
                  <>
                    <div className="bg-muted p-3 rounded-full">
                      <ShoppingCart className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-black text-sm">{dayMenu.productName}</p>
                      <p className="text-lg font-mono font-black text-primary">${dayMenu.price.toFixed(2)}</p>
                    </div>
                    {isSelected && <Badge className="bg-primary text-foreground font-black">SELECCIONADO</Badge>}
                  </>
                ) : (
                  <div className="space-y-2 opacity-50">
                    <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground" />
                    <p className="text-xs font-bold uppercase">Menú no disponible</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Card className="w-full max-w-md border-2 border-secondary shadow-xl overflow-hidden">
          <CardHeader className="bg-secondary/10 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black">Resumen de Reserva</CardTitle>
              <CardDescription>{selectedMenus.length} días seleccionados</CardDescription>
            </div>
            <ShoppingCart className="h-6 w-6 text-foreground" />
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {selectedMenus.map(m => (
              <div key={m.id} className="flex justify-between items-center text-sm font-bold border-b border-dashed pb-2">
                <span className="uppercase text-muted-foreground">{format(new Date(m.date), 'EEEE', { locale: es })}</span>
                <span>{m.productName}</span>
                <span className="font-mono">${m.price.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between items-end pt-4">
              <span className="text-xs font-black uppercase text-muted-foreground">Total a pagar</span>
              <span className="text-3xl font-mono font-black text-foreground">${totalPrice.toFixed(2)}</span>
            </div>
          </CardContent>
          <CardFooter className="p-6 pt-0">
            <Button 
              className="w-full h-14 bg-secondary text-foreground hover:bg-secondary/90 font-black text-lg gap-3 shadow-lg"
              disabled={selectedMenus.length === 0}
              onClick={handleCheckout}
            >
              <CheckCircle className="h-6 w-6" />
              CONFIRMAR Y PAGAR
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
