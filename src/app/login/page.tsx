
'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, User, Store, LayoutDashboard, Utensils } from 'lucide-react';

export default function LoginPage() {
  const roles = [
    {
      title: 'Portal de Padres',
      description: 'Gestión de saldos y reservas para hijos.',
      href: '/dashboard/parent',
      icon: User,
      color: 'bg-primary/20 text-primary',
    },
    {
      title: 'Punto de Venta (POS)',
      description: 'Sistema de cobro para cafetería.',
      href: '/dashboard/pos',
      icon: Store,
      color: 'bg-secondary/20 text-secondary-foreground',
    },
    {
      title: 'Administración de Escuela',
      description: 'Gestión de alumnos, staff y menús.',
      href: '/admin',
      icon: LayoutDashboard,
      color: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      title: 'Super Administrador',
      description: 'Control global de la plataforma NutriPass.',
      href: '/super-admin',
      icon: ShieldCheck,
      color: 'bg-slate-900 text-white',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="mb-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="bg-primary p-2 rounded-xl shadow-lg">
            <Utensils className="h-8 w-8 text-foreground" />
          </div>
          <span className="text-3xl font-black text-foreground">NutriPass</span>
        </div>
        <h1 className="text-xl font-bold text-muted-foreground uppercase tracking-widest">Selecciona tu acceso</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
        {roles.map((role) => (
          <Link key={role.title} href={role.href}>
            <Card className="hover:shadow-2xl transition-all border-2 border-transparent hover:border-primary cursor-pointer group h-full">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={`p-4 rounded-2xl transition-transform group-hover:scale-110 ${role.color}`}>
                  <role.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black">{role.title}</CardTitle>
                  <CardDescription className="font-medium">{role.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-12">
        <Button variant="ghost" asChild>
          <Link href="/" className="font-bold text-muted-foreground hover:text-foreground">
            Volver al Inicio
          </Link>
        </Button>
      </div>
    </div>
  );
}
