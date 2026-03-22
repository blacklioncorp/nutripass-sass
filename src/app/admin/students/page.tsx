'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, UserPlus, Upload, CreditCard, Tag } from 'lucide-react';
import CSVImport from '@/components/admin/CSVImport';

const mockStudents = [
  { id: '1', name: 'Juan Pérez', grade: '4º A', nfc: '123-456-789', balance: 450.00, parent: 'Roberto Pérez' },
  { id: '2', name: 'María García', grade: '3º B', nfc: '987-654-321', balance: 120.50, parent: 'Elena García' },
  { id: '3', name: 'Carlos Ruiz', grade: '5º C', nfc: 'Pending', balance: 0.00, parent: 'Ana Ruiz' },
];

export default function StudentManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNfcModalOpen, setIsNfcModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o tag..." 
            className="pl-10 bg-white" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <CSVImport onImport={(data) => console.log('Imported:', data)} />
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-foreground font-black gap-2 shadow-sm">
                <UserPlus className="h-5 w-5" />
                REGISTRAR ALUMNO
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Nuevo Estudiante</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2 col-span-2">
                  <Label className="font-bold uppercase text-xs">Nombre Completo</Label>
                  <Input placeholder="Ej. Juan Carlos Pérez" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-xs">Grado</Label>
                  <Input placeholder="4º" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-xs">Grupo/Sección</Label>
                  <Input placeholder="A" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="font-bold uppercase text-xs">Padre/Tutor Responsable</Label>
                  <Input placeholder="Nombre del tutor" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button className="bg-primary text-foreground font-black">GUARDAR ESTUDIANTE</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-2 border-primary/10 shadow-xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-black uppercase text-xs">Estudiante</TableHead>
                <TableHead className="font-black uppercase text-xs">Grado/Grupo</TableHead>
                <TableHead className="font-black uppercase text-xs">Tutor</TableHead>
                <TableHead className="font-black uppercase text-xs text-center">Tag NFC</TableHead>
                <TableHead className="font-black uppercase text-xs text-right">Saldo Wallet</TableHead>
                <TableHead className="font-black uppercase text-xs text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockStudents.map((student) => (
                <TableRow key={student.id} className="hover:bg-primary/5 transition-all group">
                  <TableCell className="font-bold py-4">{student.name}</TableCell>
                  <TableCell className="font-medium text-muted-foreground">{student.grade}</TableCell>
                  <TableCell className="text-sm">{student.parent}</TableCell>
                  <TableCell className="text-center">
                    {student.nfc === 'Pending' ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-[10px] font-black h-7 border-dashed border-amber-500 text-amber-600 hover:bg-amber-50"
                        onClick={() => { setSelectedStudent(student); setIsNfcModalOpen(true); }}
                      >
                        <Tag className="h-3 w-3 mr-1" /> ASIGNAR TAG
                      </Button>
                    ) : (
                      <Badge variant="outline" className="font-mono text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        {student.nfc}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-black text-foreground">
                    ${student.balance.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="font-bold opacity-0 group-hover:opacity-100 transition-opacity">Editar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* NFC Assignment Modal */}
      <Dialog open={isNfcModalOpen} onOpenChange={setIsNfcModalOpen}>
        <DialogContent className="sm:max-w-[400px] text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Asignar Tag NFC</DialogTitle>
          </DialogHeader>
          <div className="py-10 flex flex-col items-center gap-6">
            <div className="h-32 w-32 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <Tag className="h-16 w-16 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-bold text-lg">Esperando lectura de Tag...</p>
              <p className="text-sm text-muted-foreground">Acerque la tarjeta o el llavero al lector conectado para {selectedStudent?.name}.</p>
            </div>
            <Input className="text-center font-mono text-lg tracking-widest border-2 border-primary focus-visible:ring-0" placeholder="____-____-____" autoFocus />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="w-full" onClick={() => setIsNfcModalOpen(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
