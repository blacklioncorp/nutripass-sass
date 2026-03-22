"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, PlusCircle, AlertTriangle, ShieldCheck, History, Utensils, Settings } from 'lucide-react';
import { mockStudents, mockWallets } from '@/lib/supabase';

export default function ParentDashboard() {
  const [selectedStudent, setSelectedStudent] = useState(mockStudents[0]);

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
        <nav className="ml-auto hidden md:flex items-center gap-6">
          <Link href="#" className="text-sm font-medium hover:text-primary">Mis Alumnos</Link>
          <Link href="#" className="text-sm font-medium hover:text-primary">Menú Escolar</Link>
          <Link href="#" className="text-sm font-medium hover:text-primary">Facturación</Link>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">¡Hola, Fam. Pérez!</h1>
            <p className="text-muted-foreground">Gestiona las billeteras y nutrición de tus hijos.</p>
          </div>
          <div className="flex gap-2 bg-white p-1 rounded-lg border shadow-sm">
            {mockStudents.map(student => (
              <Button
                key={student.id}
                variant={selectedStudent.id === student.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedStudent(student)}
                className={selectedStudent.id === student.id ? "bg-primary text-foreground" : ""}
              >
                {student.full_name}
              </Button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Wallets */}
          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {studentWallets.map(wallet => (
                <Card key={wallet.id} className="relative overflow-hidden group border-2 border-primary/10 hover:border-primary/30 transition-all">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet className="h-16 w-16" />
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm uppercase tracking-wider font-bold text-muted-foreground">
                      Billetera {wallet.type}
                    </CardTitle>
                    <div className="text-3xl font-mono font-black text-foreground">
                      ${wallet.balance.toFixed(2)}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 border-t bg-muted/10">
                    <Button className="w-full bg-secondary text-foreground hover:bg-secondary/90 font-bold gap-2">
                      <PlusCircle className="h-4 w-4" />
                      RECARGAR
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Historial de Transacciones</CardTitle>
                  <CardDescription>Últimos consumos realizados en la escuela.</CardDescription>
                </div>
                <History className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { id: 1, desc: 'Sándwich de Jamón', amt: -35.00, date: 'Hoy, 10:15 AM', type: 'snack' },
                    { id: 2, desc: 'Recarga Tarjeta Crédito', amt: 500.00, date: 'Ayer, 18:45 PM', type: 'comedor' },
                    { id: 3, desc: 'Almuerzo Ejecutivo', amt: -85.00, date: 'Ayer, 13:20 PM', type: 'comedor' },
                  ].map(t => (
                    <div key={t.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-muted/50 transition-colors border">
                      <div className="flex gap-3 items-center">
                        <div className={`p-2 rounded-full ${t.amt < 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
                          {t.amt < 0 ? <Utensils className="h-4 w-4 text-red-600" /> : <Wallet className="h-4 w-4 text-emerald-600" />}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{t.desc}</div>
                          <div className="text-xs text-muted-foreground">{t.date} • {t.type}</div>
                        </div>
                      </div>
                      <div className={`font-mono font-bold ${t.amt < 0 ? 'text-foreground' : 'text-emerald-600'}`}>
                        {t.amt < 0 ? '-' : '+'}${Math.abs(t.amt).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls & Allergies */}
          <div className="space-y-6">
            <Card className="border-2 border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Salud y Seguridad</CardTitle>
                </div>
                <CardDescription>Restricciones para {selectedStudent.full_name}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Alergias Registradas</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudent.allergies.length > 0 ? (
                      selectedStudent.allergies.map((a, i) => (
                        <Badge key={i} variant="destructive" className="px-3 py-1 font-bold">
                          {a}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm italic">Sin alergias reportadas</span>
                    )}
                    <Button variant="outline" size="sm" className="rounded-full border-dashed h-7">
                      <PlusCircle className="h-3 w-3 mr-1" /> Editar
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center gap-2 text-amber-600 mb-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase">Productos Bloqueados</span>
                  </div>
                  <div className="text-sm p-3 bg-white rounded-lg border text-muted-foreground">
                    No hay productos bloqueados manualmente.
                  </div>
                  <Button variant="link" className="text-xs h-auto p-0">Configurar límites de gasto diario</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-secondary/10 border-secondary/20">
              <CardHeader>
                <CardTitle className="text-md">¿Cómo funciona?</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1. Recarga el saldo desde tu celular.</p>
                <p>2. Tu hijo paga con su tag NFC en la escuela.</p>
                <p>3. Recibes alertas de consumo en tiempo real.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}