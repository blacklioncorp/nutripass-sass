'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { School, Users, CreditCard, Plus, Search, Building2, Mail, User } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export default function SuperAdminDashboard() {
  const db = useFirestore();
  const schoolsQuery = useMemoFirebase(() => collection(db, 'schools'), [db]);
  const { data: schools, isLoading } = useCollection(schoolsQuery);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSchool, setNewSchool] = useState({ name: '', adminName: '', adminEmail: '' });

  const handleCreateSchool = () => {
    if (!newSchool.name || !newSchool.adminEmail) return;

    const schoolId = doc(collection(db, 'schools')).id;
    const schoolData = {
      id: schoolId,
      name: newSchool.name,
      contactEmail: newSchool.adminEmail,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Create School
    setDoc(doc(db, 'schools', schoolId), schoolData);

    // Create Admin Profile (mocking the auth linkage)
    const adminProfileId = `admin_${schoolId}`; // In real app, this would be the actual Auth UID
    const profileData = {
      id: adminProfileId,
      fullName: newSchool.adminName,
      role: 'school_admin',
      schoolId: schoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDoc(doc(db, 'profiles', adminProfileId), profileData);

    setNewSchool({ name: '', adminName: '', adminEmail: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Building2 className="h-10 w-10 text-primary" />
            NutriPass Master
          </h1>
          <p className="text-muted-foreground font-medium">Panel de Control Global (Super Admin)</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-foreground hover:bg-primary/90 font-bold gap-2 shadow-lg h-12">
              <Plus className="h-5 w-5" />
              NUEVA ESCUELA
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black">Registrar Nueva Escuela</DialogTitle>
              <CardDescription>Crea un nuevo tenant y asigna un administrador principal.</CardDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="font-bold uppercase text-xs">Nombre de la Escuela</Label>
                <Input 
                  id="name" 
                  value={newSchool.name} 
                  onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                  placeholder="Ej. Escuela San Agustín" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin" className="font-bold uppercase text-xs">Nombre del Administrador</Label>
                <Input 
                  id="admin" 
                  value={newSchool.adminName} 
                  onChange={(e) => setNewSchool({...newSchool, adminName: e.target.value})}
                  placeholder="Ej. Juan Pérez" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="font-bold uppercase text-xs">Correo Electrónico Admin</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={newSchool.adminEmail} 
                  onChange={(e) => setNewSchool({...newSchool, adminEmail: e.target.value})}
                  placeholder="admin@escuela.com" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button className="bg-primary text-foreground font-bold" onClick={handleCreateSchool}>CREAR TENANT</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-2 border-primary/20 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
              <School className="h-4 w-4 text-primary" /> Escuelas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">{isLoading ? '...' : schools?.length || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-primary/20 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Usuarios Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">1,248</div>
          </CardContent>
        </Card>
        <Card className="border-2 border-primary/20 shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Transacciones Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-black">$45,200.00</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl overflow-hidden border-2 border-primary/10">
        <CardHeader className="bg-primary/5 flex flex-row items-center justify-between py-6">
          <CardTitle>Listado de Instituciones</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar escuela..." className="pl-8 bg-white" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold">NOMBRE DE LA ESCUELA</TableHead>
                <TableHead className="font-bold">CONTACTO</TableHead>
                <TableHead className="font-bold text-center">ESTADO</TableHead>
                <TableHead className="font-bold text-right">ACCIONES</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10">Cargando...</TableCell></TableRow>
              ) : schools?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10">No hay escuelas registradas.</TableCell></TableRow>
              ) : (
                schools?.map((school) => (
                  <TableRow key={school.id} className="hover:bg-primary/5 transition-colors">
                    <TableCell className="font-bold text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-lg"><School className="h-5 w-5 text-foreground" /></div>
                        {school.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{school.contactEmail}</span>
                        <span className="text-xs text-muted-foreground uppercase font-black">Soporte Directo</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={school.isActive ? "default" : "secondary"} className={school.isActive ? "bg-emerald-100 text-emerald-800 border-emerald-200" : ""}>
                        {school.isActive ? "ACTIVA" : "INACTIVA"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">Gestionar</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
