
"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, PlusCircle, AlertTriangle, ShieldCheck, History, Utensils, Settings, CalendarRange } from 'lucide-react';
import { mockStudents, mockWallets } from '@/lib/supabase';
import NotificationBell from '@/components/notifications/NotificationBell';
import NutriPointsCard from '@/components/dashboard/NutriPointsCard';
import { cn } from '@/lib/utils';

export default function ParentDashboard() {
  const [selectedStudent, setSelectedStudent] = useState(mockStudents[0]);

  // Mock parent user ID
  const parentId = "parent1";
  const studentWallets = mockWallets.filter(w => w.student_id === selectedStudent.id);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 h-16 flex items-center bg-white border-b shadow-sm sticky top-0 z-50">
        <Link className="flex items-center gap-2" href="/">
          <div className="bg-primary p-1.5 rounded-lg">
            <Utensils className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-lg font-headline font-bold text-foreground">NutriPass Padres</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4">
          <div className="hidden md:flex items-center gap-6 mr-4 border-r pr-6">
            <Link href="/dashboard/parent/pre-order" className="text-sm font-bold flex items-center gap-2 text-primary hover:text-primary/80">
              <CalendarRange className="h-4 w-4" /> Reserva Semanal
            </Link>
            <Link href="#" className="text-sm font-medium hover:text-primary">Mis Alumnos</Link>
          </div>
          
          <NotificationBell userId={parentId} />
          
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
            <Settings className="h-5 w-5" />
          </Button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight">¡Hola, Fam. Pérez!</h1>
            <p className="text-muted-foreground font-medium">Gestiona las billeteras y nutrición de tus hijos.</p>
          </div>
          <div className="flex gap-2 bg-white p-1 rounded-2xl border shadow-sm">
            {mockStudents.map(student => (
              <Button
                key={student.id}
                variant={selectedStudent.id === student.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedStudent(student)}
                className={selectedStudent.id === student.id ? "bg-primary text-foreground font-black rounded-xl" : "font-bold rounded-xl"}
              >
                {student.full_name}
              </Button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Wallets */}
          <div className="md:col-span-2 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {studentWallets.map(wallet => (
                <Card key={wallet.id} className="relative overflow-hidden group border-2 border-primary/10 hover:border-primary/30 transition-all rounded-3xl shadow-sm">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet className="h-20 w-20" />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-[0.2em] font-black text-muted-foreground">
                      Billetera {wallet.type}
                    </CardTitle>
                    <div className="text-4xl font-mono font-black text-foreground">
                      ${wallet.balance.toFixed(2)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 border-t bg-muted/10">
                    <Button className="w-full bg-secondary text-foreground hover:bg-secondary/90 font-black h-12 rounded-xl gap-2 shadow-lg">
                      <PlusCircle className="h-5 w-5" />
                      RECARGAR SALDO
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="rounded-3xl shadow-xl border-2 border-slate-50">
              <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 p-8 rounded-t-3xl">
                <div>
                  <CardTitle className="text-xl font-black">Historial de Transacciones</CardTitle>
                  <CardDescription className="font-medium">Últimos consumos realizados en la escuela.</CardDescription>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center">
                  <History className="h-6 w-6 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {[
                    { id: 1, desc: 'Sándwich de Jamón', amt: -35.00, date: 'Hoy, 10:15 AM', type: 'snack' },
                    { id: 2, desc: 'Recarga Tarjeta Crédito', amt: 500.00, date: 'Ayer, 18:45 PM', type: 'comedor' },
                    { id: 3, desc: 'Almuerzo Ejecutivo', amt: -85.00, date: 'Ayer, 13:20 PM', type: 'comedor' },
                  ].map(t => (
                    <div key={t.id} className="flex justify-between items-center p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex gap-4 items-center">
                        <div className={cn(
                          "h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm",
                          t.amt < 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'
                        )}>
                          {t.amt < 0 ? <Utensils className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="font-black text-sm uppercase tracking-tight">{t.desc}</div>
                          <div className="text-xs text-muted-foreground font-bold uppercase">{t.date} • {t.type}</div>
                        </div>
                      </div>
                      <div className={cn(
                        "font-mono text-lg font-black",
                        t.amt < 0 ? 'text-foreground' : 'text-emerald-600'
                      )}>
                        {t.amt < 0 ? '-' : '+'}${Math.abs(t.amt).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls & Nutri-Points */}
          <div className="space-y-8">
            <NutriPointsCard points={selectedStudent.id === 's1' ? 450 : 1200} studentName={selectedStudent.full_name} />
            
            <Card className="border-4 border-primary/20 bg-primary/5 rounded-3xl shadow-lg">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary rounded-xl">
                    <ShieldCheck className="h-6 w-6 text-white" />
                  </div>
                  <CardTitle className="text-xl font-black">Salud y Seguridad</CardTitle>
                </div>
                <CardDescription className="font-medium text-primary">Restricciones para {selectedStudent.full_name}.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Alergias Registradas</label>
                  <div className="flex flex-wrap gap-2">
                    {(selectedStudent.allergies || []).length > 0 ? (
                      selectedStudent.allergies.map((a, i) => (
                        <Badge key={i} variant="destructive" className="px-4 py-2 font-black rounded-xl border-none shadow-md">
                          {a.toUpperCase()}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm italic font-medium text-muted-foreground">Sin alergias reportadas</span>
                    )}
                    <Button variant="outline" size="sm" className="rounded-xl border-2 border-dashed h-9 font-black bg-white hover:bg-primary/10">
                      <PlusCircle className="h-4 w-4 mr-2" /> EDITAR
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 border-t border-primary/10 pt-6">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-xs font-black uppercase tracking-tight">Productos Bloqueados</span>
                  </div>
                  <div className="text-sm p-4 bg-white/50 rounded-2xl border-2 border-dashed border-amber-200 text-muted-foreground font-medium italic">
                    No hay productos bloqueados manualmente.
                  </div>
                  <Button variant="link" className="text-xs h-auto p-0 font-black text-primary uppercase tracking-tighter">Límites de gasto diario</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
