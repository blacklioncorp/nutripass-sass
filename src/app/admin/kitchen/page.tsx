
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChefHat, Printer, FileDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { format, startOfToday, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

export default function KitchenReport() {
  const db = useFirestore();
  const schoolId = 'sch1';
  const todayStr = format(startOfToday(), 'yyyy-MM-dd');

  const ordersQuery = useMemoFirebase(() => 
    query(collection(db, 'schools', schoolId, 'preOrders'), where('status', '==', 'paid')), 
    [db, schoolId]
  );
  const { data: orders } = useCollection(ordersQuery);

  // Group by product for today
  const productionToday = orders?.filter(o => o.date === todayStr).reduce((acc: any, curr) => {
    if (!acc[curr.productId]) {
      acc[curr.productId] = { name: curr.productName, count: 0 };
    }
    acc[curr.productId].count += 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-in slide-in-from-left-2 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3">
            <ChefHat className="h-8 w-8 text-secondary" />
            Reporte de Producción
          </h1>
          <p className="text-muted-foreground font-medium">Consolidados de cocina para hoy: {format(new Date(), 'dd MMMM yyyy', { locale: es })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 font-bold"><Printer className="h-4 w-4" /> Imprimir</Button>
          <Button variant="outline" className="gap-2 font-bold"><FileDown className="h-4 w-4" /> Exportar</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-2 border-secondary/20 shadow-xl overflow-hidden">
          <CardHeader className="bg-secondary/10 py-6">
            <CardTitle className="text-xl font-black">Preparación del Día</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-black">Platillo / Producto</TableHead>
                  <TableHead className="font-black text-center">Cantidad Total</TableHead>
                  <TableHead className="font-black text-right">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!productionToday || Object.keys(productionToday).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-20 text-muted-foreground font-medium italic">
                      No hay pedidos registrados para hoy.
                    </TableCell>
                  </TableRow>
                ) : (
                  Object.values(productionToday).map((item: any) => (
                    <TableRow key={item.name} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold py-6 text-lg">{item.name}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-secondary text-foreground font-black text-xl shadow-inner">
                          {item.count}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
                          Listo para Servicio
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase text-primary">Resumen Semanal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map(i => {
              const date = addDays(startOfToday(), i);
              const count = orders?.filter(o => o.date === format(date, 'yyyy-MM-dd')).length || 0;
              return (
                <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-primary/5 shadow-sm">
                  <div>
                    <p className="font-black text-sm uppercase text-muted-foreground">{format(date, 'EEEE', { locale: es })}</p>
                    <p className="text-xs font-medium text-primary">{format(date, 'dd MMM')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black">{count}</p>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Órdenes</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
