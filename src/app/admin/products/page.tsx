
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, ShoppingBag, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const mockProducts = [
  { id: '1', name: 'Almuerzo Ejecutivo', price: 85.00, category: 'comedor', isAvailable: true, description: 'Plato principal + guarnición' },
  { id: '2', name: 'Sándwich Jamón/Queso', price: 35.00, category: 'snack', isAvailable: true, description: 'Pan integral, jamón de pavo' },
  { id: '3', name: 'Jugo de Naranja', price: 20.00, category: 'bebida', isAvailable: false, description: 'Natural 100%' },
];

export default function ProductCatalog() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Catálogo de Cafetería
          </h1>
          <p className="text-sm text-muted-foreground">Administra los productos y menús disponibles hoy.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary text-foreground font-black gap-2 shadow-lg">
              <Plus className="h-5 w-5" />
              NUEVO PRODUCTO
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Detalles del Producto</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label className="font-bold uppercase text-xs">Nombre del Producto</Label>
                <Input placeholder="Ej. Hamburguesa Nutri" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-xs">Precio Base ($)</Label>
                  <Input type="number" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-xs">Categoría</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comedor">Comedor</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                      <SelectItem value="bebida">Bebida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold uppercase text-xs">Descripción</Label>
                <Input placeholder="Ingredientes básicos..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button className="bg-primary text-foreground font-black">GUARDAR PRODUCTO</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['comedor', 'snack', 'bebida'].map(cat => (
          <Card key={cat} className="border-2 border-primary/5 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center justify-between">
                {cat} <span>{mockProducts.filter(p => p.category === cat).length} items</span>
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="border-2 border-primary/10 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-xs">Producto</TableHead>
                <TableHead className="font-black uppercase text-xs">Categoría</TableHead>
                <TableHead className="font-black uppercase text-xs text-right">Precio</TableHead>
                <TableHead className="font-black uppercase text-xs text-center">Disponible</TableHead>
                <TableHead className="font-black uppercase text-xs text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockProducts.map((product) => (
                <TableRow key={product.id} className="hover:bg-primary/5 transition-colors">
                  <TableCell>
                    <div className="font-bold">{product.name}</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-black">{product.description}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize font-bold bg-primary/5">{product.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-black">${product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    {product.isAvailable ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted mx-auto" />
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
