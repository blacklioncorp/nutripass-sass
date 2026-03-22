'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, UserPlus, CreditCard, Tag, Briefcase } from 'lucide-react';

const mockStaff = [
  { id: '1', name: 'Lic. Martha Sosa', position: 'Docente Primaria', nfc: '555-444-333', balance: 1200.00, userType: 'staff' },
  { id: '2', name: 'Ing. Luis Méndez', position: 'Soporte IT', nfc: 'Pending', balance: 0.00, userType: 'staff' },
  { id: '3', name: 'Dra. Claudia Ramos', position: 'Dirección Académica', nfc: '111-222-333', balance: 2500.00, userType: 'staff' },
];

export default function StaffManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar personal..." 
            className="pl-10 bg-white" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-secondary text-foreground font-black gap-2 shadow-sm">
              <Plus className="h-5 w-5" />
              REGISTRAR PERSONAL
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Nuevo Miembro del Staff</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2 col-span-2">
                <Label className="font-bold uppercase text-xs">Nombre Completo</Label>
                <Input placeholder="Ej. Martha Alicia Sosa" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="font-bold uppercase text-xs">Cargo / Posición</Label>
                <Input placeholder="Ej. Docente de Matemáticas" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="font-bold uppercase text-xs">Correo Institucional</Label>
                <Input type="email" placeholder="martha.sosa@escuela.com" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button className="bg-secondary text-foreground font-black">GUARDAR MIEMBRO</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-2 border-secondary/10 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-xs">Nombre</TableHead>
                <TableHead className="font-black uppercase text-xs">Cargo</TableHead>
                <TableHead className="font-black uppercase text-xs text-center">Tag NFC</TableHead>
                <TableHead className="font-black uppercase text-xs text-right">Saldo Billetera</TableHead>
                <TableHead className="font-black uppercase text-xs text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockStaff.map((person) => (
                <TableRow key={person.id} className="hover:bg-secondary/5 transition-all group">
                  <TableCell className="font-bold py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-secondary/20 p-2 rounded-lg">
                        <Briefcase className="h-4 w-4 text-foreground" />
                      </div>
                      {person.name}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-muted-foreground">{person.position}</TableCell>
                  <TableCell className="text-center">
                    {person.nfc === 'Pending' ? (
                      <Badge variant="outline" className="border-dashed border-amber-500 text-amber-600">PENDIENTE</Badge>
                    ) : (
                      <Badge variant="outline" className="font-mono text-[10px] bg-secondary/10 text-foreground border-secondary/20">
                        {person.nfc}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-black text-foreground">
                    ${person.balance.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="font-bold">Gestionar</Button>
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
