
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Plus, Trash2, Utensils, Save, ChefHat, Info, X } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { format, addDays, startOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function MenuPlanner() {
  const db = useFirestore();
  const schoolId = 'sch1';
  
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

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activeDay, setActiveDay] = useState<Date | null>(null);

  const handleAddMenuItem = async (product: any) => {
    if (!activeDay) return;

    const dateStr = format(activeDay, 'yyyy-MM-dd');
    const menuId = `${dateStr}_${product.id}`;
    const menuRef = doc(db, 'schools', schoolId, 'menus', menuId);

    try {
      await setDoc(menuRef, {
        id: menuId,
        schoolId,
        date: dateStr,
        productId: product.id,
        productName: product.name,
        price: product.price,
        availableQuantity: 100
      });
      toast({ 
        title: "Menú actualizado", 
        description: `${product.name} asignado al ${format(activeDay, 'EEEE', { locale: es })}` 
      });
      setIsPickerOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el menú." });
    }
  };

  const handleRemoveMenuItem = async (menuId: string) => {
    await deleteDoc(doc(db, 'schools', schoolId, 'menus', menuId));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black flex items-center gap-4 tracking-tight">
            <ChefHat className="h-10 w-10 text-primary" />
            Planificador <span className="text-primary">Mata-Mermas</span>
          </h1>
          <p className="text-muted-foreground font-medium text-lg max-w-2xl">
            Diseña la experiencia gastronómica de tus alumnos. Define los platillos del comedor para optimizar la producción.
          </p>
        </div>
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-center gap-3">
          <Info className="h-5 w-5 text-primary" />
          <div className="text-xs">
            <p className="font-black uppercase text-primary">Próxima Semana</p>
            <p className="font-medium">Las reservas se cierran los Domingos a las 10 PM.</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {weekDays.map((day) => {
          const dayMenus = menus?.filter(m => m.date === format(day, 'yyyy-MM-dd')) || [];
          const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

          return (
            <div key={day.toString()} className="flex flex-col gap-4">
              <div className={cn(
                "p-4 rounded-2xl text-center border-2 transition-all",
                isToday ? "bg-primary text-foreground border-primary shadow-lg scale-105" : "bg-white border-primary/5"
              )}>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  {format(day, 'EEEE', { locale: es })}
                </p>
                <p className="text-2xl font-black">{format(day, 'dd')}</p>
              </div>

              <div className="flex-1 space-y-3">
                {dayMenus.map((item) => (
                  <Card key={item.id} className="group relative border-2 border-primary/10 hover:border-primary/40 transition-all shadow-sm overflow-hidden animate-in slide-in-from-top-2">
                    <CardContent className="p-4 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black">COMEDOR</Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveMenuItem(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="font-black text-sm leading-tight uppercase">{item.productName}</p>
                      <p className="font-mono font-black text-primary text-xs">${item.price.toFixed(2)}</p>
                    </CardContent>
                  </Card>
                ))}

                <Button 
                  variant="outline" 
                  className="w-full h-24 border-2 border-dashed border-muted hover:border-primary hover:bg-primary/5 rounded-2xl flex flex-col gap-2 group transition-all"
                  onClick={() => { setActiveDay(day); setIsPickerOpen(true); }}
                >
                  <div className="bg-muted p-2 rounded-full group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">Añadir Platillo</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Slide-over Picker */}
      <Dialog open={isPickerOpen} onOpenChange={setIsPickerOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-center gap-2">
              <Utensils className="h-6 w-6 text-primary" />
              Catálogo de Comedor
            </DialogTitle>
            <DialogDescription className="font-medium">
              Selecciona el platillo principal para el {activeDay && format(activeDay, 'EEEE dd MMMM', { locale: es })}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-6 max-h-[60vh] overflow-y-auto pr-2">
            {products?.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:border-primary transition-all group border-2 border-primary/5"
                onClick={() => handleAddMenuItem(product)}
              >
                <CardContent className="p-4 flex gap-4 items-center">
                  <div className="bg-muted p-3 rounded-2xl group-hover:bg-primary/10 transition-colors">
                    <ChefHat className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm uppercase leading-tight">{product.name}</p>
                    <p className="font-mono font-black text-primary">${product.price.toFixed(2)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!products || products.length === 0) && (
              <div className="col-span-2 text-center py-10">
                <p className="text-muted-foreground font-medium italic">No hay platillos en la categoría "Comedor".</p>
                <Button variant="link" className="text-primary font-bold">Configurar Catálogo</Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
