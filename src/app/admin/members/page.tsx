
'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  UserPlus, 
  Tag, 
  UserCog, 
  UserCheck, 
  ShieldAlert,
  Edit,
  MoreVertical
} from 'lucide-react';
import CSVUploader from '@/components/admin/CSVUploader';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// Mock data (In production this uses useCollection)
const mockMembers = [
  { id: '1', firstName: 'Juan', lastName: 'Pérez', identifier: '2024-001', userType: 'student', grade: '4º A', nfc: '123-456', balance: 450.00, isActive: true },
  { id: '2', firstName: 'Martha', lastName: 'Sosa', identifier: 'STAFF-102', userType: 'staff', grade: null, nfc: '555-444', balance: 1200.00, isActive: true },
  { id: '3', firstName: 'Carlos', lastName: 'Ruiz', identifier: '2024-002', userType: 'student', grade: '5º C', nfc: null, balance: 0.00, isActive: false },
];

export default function ConsumersManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isNfcModalOpen, setIsNfcModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const filteredMembers = mockMembers.filter(m => 
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.identifier.includes(searchTerm)
  );

  const students = filteredMembers.filter(m => m.userType === 'student');
  const staff = filteredMembers.filter(m => m.userType === 'staff');

  const MemberTable = ({ data, type }: { data: any[], type: string }) => (
    <Card className="border-2 border-primary/10 shadow-xl overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-black uppercase text-xs">Nombre Completo</TableHead>
              <TableHead className="font-black uppercase text-xs">Identificador</TableHead>
              {type === 'student' && <TableHead className="font-black uppercase text-xs">Grado</TableHead>}
              <TableHead className="font-black uppercase text-xs text-center">NFC Tag</TableHead>
              <TableHead className="font-black uppercase text-xs text-right">Saldo</TableHead>
              <TableHead className="font-black uppercase text-xs text-center">Estado</TableHead>
              <TableHead className="font-black uppercase text-xs text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((member) => (
              <TableRow key={member.id} className="hover:bg-primary/5 transition-all">
                <TableCell className="font-bold py-4">{member.firstName} {member.lastName}</TableCell>
                <TableCell className="font-mono text-xs">{member.identifier}</TableCell>
                {type === 'student' && <TableCell className="font-medium text-muted-foreground">{member.grade}</TableCell>}
                <TableCell className="text-center">
                  {member.nfc ? (
                    <Badge variant="outline" className="font-mono text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      {member.nfc}
                    </Badge>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-[10px] font-black h-7 text-amber-600 hover:text-amber-700 p-0"
                      onClick={() => { setSelectedMember(member); setIsNfcModalOpen(true); }}
                    >
                      <Tag className="h-3 w-3 mr-1" /> VINCULAR
                    </Button>
                  )}
                </TableCell>
                <TableCell className="text-right font-black text-foreground">
                  ${member.balance.toFixed(2)}
                </TableCell>
                <TableCell className="text-center">
                  {member.isActive ? (
                    <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">Activo</Badge>
                  ) : (
                    <Badge variant="destructive" className="bg-red-500/10 text-red-700 border-red-500/20">Suspendido</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o ID..." 
            className="pl-10 bg-white" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <CSVUploader onImport={(data) => console.log('Imported:', data)} />
          <Button className="bg-primary text-foreground font-black gap-2 shadow-sm">
            <UserPlus className="h-5 w-5" />
            NUEVO REGISTRO
          </Button>
        </div>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-6 bg-muted/50 p-1">
          <TabsTrigger value="students" className="font-bold data-[state=active]:bg-primary">
            ALUMNOS ({students.length})
          </TabsTrigger>
          <TabsTrigger value="staff" className="font-bold data-[state=active]:bg-secondary">
            PERSONAL ({staff.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="students">
          <MemberTable data={students} type="student" />
        </TabsContent>
        <TabsContent value="staff">
          <MemberTable data={staff} type="staff" />
        </TabsContent>
      </Tabs>

      {/* NFC Linker Dialog */}
      <Dialog open={isNfcModalOpen} onOpenChange={setIsNfcModalOpen}>
        <DialogContent className="sm:max-w-[400px] text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Vincular Tag NFC</DialogTitle>
          </DialogHeader>
          <div className="py-10 flex flex-col items-center gap-6">
            <div className="h-32 w-32 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <Tag className="h-16 w-16 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-bold text-lg">Esperando lectura de Tag...</p>
              <p className="text-sm text-muted-foreground">
                Acerque el tag al lector para <strong>{selectedMember?.firstName} {selectedMember?.lastName}</strong>.
              </p>
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
