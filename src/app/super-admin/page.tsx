'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { School, Users, CreditCard, Plus, Search, Building2, Activity, ExternalLink } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

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
      staffDiscountActive: false,
      staffDiscountPercentage: 0
    };

    // Create School Tenant
    setDoc(doc(db, 'schools', schoolId), schoolData);

    // Create Admin Profile for the school
    const adminProfileId = `admin_${schoolId}`;
    setDoc(doc(db, 'profiles', adminProfileId), {
      id: adminProfileId,
      fullName: newSchool.adminName,
      email: newSchool.adminEmail,
      role: 'school_admin',
      schoolId: schoolId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setNewSchool({ name: '', adminName: '', adminEmail: '' });
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tight text-slate-900">
            Resumen <span className="text-primary">Maestro</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg">Métricas clave de toda la red NutriPass.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-foreground hover:bg-primary/90 font-black gap-3 shadow-2xl h-16 px-8 rounded-2xl text-lg">
              <Plus className="h-6 w-6" />
              REGISTRAR ESCUELA
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] rounded-3xl p-8 border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-slate-900">Nueva Institución</DialogTitle>
              <CardDescription className="text-base">
                Configura un nuevo entorno (tenant) para NutriPass.
              </CardDescription>
            </DialogHeader>
            <div className="space-y-6 py-8">
              <div className="space-y-3">
                <Label className="font-black uppercase text-[10px] tracking-widest text-slate-400">Nombre de la Institución</Label>
                <Input 
                  value={newSchool.name} 
                  onChange={(e) => setNewSchool({...newSchool, name: e.target.value})}
                  placeholder="Escuela Internacional de Xalapa" 
                  className="h-14 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label className="font-black uppercase text-[10px] tracking-widest text-slate-400">Admin Principal</Label>
                  <Input 
                    value={newSchool.adminName} 
                    onChange={(e) => setNewSchool({...newSchool, adminName: e.target.value})}
                    placeholder="Nombre" 
                    className="h-14 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary font-bold"
                  />
                </div>
                <div className="space-y-3">
                  <Label className="font-black uppercase text-[10px] tracking-widest text-slate-400">Email Admin</Label>
                  <Input 
                    type="email" 
                    value={newSchool.adminEmail} 
                    onChange={(e) => setNewSchool({...newSchool, adminEmail: e.target.value})}
                    placeholder="email@admin.com" 
                    className="h-14 bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-primary font-bold"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold h-14 rounded-xl">Cancelar</Button>
              <Button className="bg-primary text-foreground font-black h-14 rounded-xl px-8" onClick={handleCreateSchool}>
                CREAR ENTORNOS
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { title: 'Instituciones', value: isLoading ? '...' : schools?.length || 0, icon: School, color: 'bg-blue-500', trend: '+2 este mes' },
          { title: 'Usuarios Totales', value: '1.2k', icon: Users, color: 'bg-primary', trend: '+12% vs last month' },
          { title: 'Procesado (Mes)', value: '$45k', icon: CreditCard, color: 'bg-emerald-500', trend: '+$8,400 hoy' },
          { title: 'Uptime Sistema', value: '99.9%', icon: Activity, color: 'bg-slate-900', trend: 'Global' },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden group">
            <CardContent className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={`${stat.color} p-4 rounded-2xl shadow-lg shadow-inherit/20`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <Badge variant="outline" className="font-black text-[10px] tracking-tighter text-slate-400 border-slate-100">
                  {stat.trend}
                </Badge>
              </div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest mb-1">{stat.title}</p>
              <div className="text-4xl font-black text-slate-900 tracking-tighter">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Table Card */}
      <Card className="shadow-2xl shadow-slate-200/60 border-none rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="p-10 border-b border-slate-50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-black text-slate-900">Control de Tenants</CardTitle>
            <CardDescription className="font-medium text-slate-400 mt-1">Directorio maestro de escuelas registradas.</CardDescription>
          </div>
          <div className="relative w-80">
            <Search className="absolute left-4 top-4 h-5 w-5 text-slate-300" />
            <Input 
              placeholder="Filtrar por nombre o admin..." 
              className="pl-12 h-12 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-primary" 
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-slate-50">
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-16 px-10">Escuela / ID</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-16">Admin Responsable</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-16 text-center">Estado</TableHead>
                <TableHead className="font-black uppercase text-[10px] tracking-widest text-slate-400 h-16 text-right px-10">Panel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-20 font-black text-slate-300 animate-pulse">CARGANDO NODOS...</TableCell></TableRow>
              ) : schools?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-24 text-slate-400 font-medium italic">No se han registrado escuelas en la red.</TableCell></TableRow>
              ) : (
                schools?.map((school) => (
                  <TableRow key={school.id} className="hover:bg-slate-50/30 transition-all border-slate-50">
                    <TableCell className="px-10 py-8">
                      <div className="flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/5">
                          <Building2 className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-lg leading-tight">{school.name}</p>
                          <p className="font-mono text-[10px] text-slate-400 mt-1">UID: {school.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700">{school.contactEmail}</span>
                        <span className="text-[10px] font-black text-primary uppercase mt-0.5">Soporte Master</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "font-black text-[10px] tracking-widest px-4 py-1.5 rounded-full border-2",
                        school.isActive 
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                          : "bg-slate-50 text-slate-400 border-slate-100"
                      )}>
                        {school.isActive ? "ACTIVO" : "OFFLINE"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-10">
                      <Button variant="ghost" size="sm" className="font-black gap-2 hover:bg-primary/10 hover:text-primary transition-all">
                        GESTIONAR <ExternalLink className="h-4 w-4" />
                      </Button>
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
