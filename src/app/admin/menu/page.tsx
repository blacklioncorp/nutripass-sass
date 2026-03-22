
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Plus, Trash2, Utensils, Save } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { format, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

export default function MenuPlanner() {
  const db = useFirestore();
  const schoolId = 'sch1'; // Mock schoolId
  
  const productsQuery = useMemoFirebase(() => 
    query(collection(db, 'schools', schoolId, 'products'), where('category', '==', 'comedor')), 
    [db, schoolId]
  );
  const { data: products } = useCollection(productsQuery);

  const startOfCurrentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 5 }, (_, i) => addDays(startOfCurrentWeek, i));

  const menusQuery = useMemoFirebase(() => 
    collection(db, 'schools', schoolId, 'menus'), 
    [db, schoolId]
  );
  const { data: menus } = useCollection(menusQuery);

  const [selectedProduct, setSelectedProduct] = useState<string>('');

  const handleAddMenuItem = (date: Date) => {
    if (!selectedProduct) return;
    const product = products?.find(p => p.id === selectedProduct);
    if (!product) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const menuId = `${dateStr}_${product.id}`;
    const menuRef = doc(db, 'schools', schoolId, 'menus', menuId);

    setDoc(menuRef, {
      id: menuId,
      schoolId,
      date: dateStr,
      productId: product.id,
      productName: product.name,
      price: product.price,
      availableQuantity: 100 // Default quantity
    }).then(() => {
      toast({ title: "Menú actualizado", description: `Se añadió ${product.name} al ${format(date, 'EEEE', { locale: es })}` });
    });
  };

  const handleRemoveMenuItem = (menuId: string) => {
    deleteDoc(doc(db, 'schools', schoolId, 'menus', menuId));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-black flex items-center gap-3">
          <CalendarIcon className="h-8 w-8 text-primary" />
          Planificador Mata-Mermas
        </h1>
        <p className="text-muted-foreground font-medium">Define los platillos del comedor para la semana actual.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {weekDays.map((day) => {
          const dayMenus = menus?.filter(m => m.date === format(day, 'yyyy-MM-dd')) || [];
          return (
            <Card key={day.toString()} className="border-2 border-primary/10 bg-white">
              <CardHeader className="p-4 bg-muted/30 border-b">
                <CardTitle className="text-xs font-black uppercase text-center text-primary">
                  {format(day, 'EEEE dd', { locale: es })}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  {dayMenus.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded bg-primary/5 border border-primary/20 text-xs">
                      <span className="font-bold truncate max-w-[100px]">{item.productName}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-destructive"
                        onClick={() => handleRemoveMenuItem(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t space-y-2">
                  <Select onValueChange={setSelectedProduct}>
                    <SelectTrigger className="h-8 text-[10px] font-bold">
                      <SelectValue placeholder="Elegir platillo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    className="w-full h-8 text-[10px] font-black gap-1" 
                    onClick={() => handleAddMenuItem(day)}
                  >
                    <Plus className="h-3 w-3" /> AÑADIR
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
