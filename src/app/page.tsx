
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ShieldCheck, Utensils, Tablet, School, ShieldAlert } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-white border-b sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2" href="/">
          <div className="bg-primary p-1.5 rounded-lg">
            <Utensils className="h-6 w-6 text-foreground" />
          </div>
          <span className="text-xl font-headline font-bold text-foreground">NutriPass</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-black text-primary hover:underline underline-offset-4" href="/login">
            INGRESAR
          </Link>
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="#features">
            Características
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-4">
                <h1 className="text-4xl font-black tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl/none text-foreground">
                  Gestión Inteligente de <span className="text-primary">Comedores Escolares</span>
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl font-medium">
                  Conectando padres, escuelas y cafeterías para una alimentación escolar segura, rápida y sin efectivo.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-8">
                <Button size="lg" className="bg-primary text-foreground hover:bg-primary/90 font-black h-16 px-8 rounded-2xl shadow-xl" asChild>
                  <Link href="/dashboard/pos">IR AL POS (CAFETERÍA)</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-2 font-black h-16 px-8 rounded-2xl shadow-xl hover:bg-muted" asChild>
                  <Link href="/dashboard/parent">PORTAL DE PADRES</Link>
                </Button>
                <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800 font-black h-16 px-8 rounded-2xl shadow-xl flex gap-2" asChild>
                  <Link href="/super-admin">
                    <ShieldAlert className="h-5 w-5" />
                    SUPER ADMIN
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-none shadow-md bg-background/50 p-4">
                <CardHeader>
                  <div className="bg-primary/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
                    <Wallet className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="font-black">Billetera Digital</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground font-medium">Recargas instantáneas y control de saldos diferenciados para almuerzos y snacks.</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md bg-background/50 p-4">
                <CardHeader>
                  <div className="bg-primary/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="font-black">Control de Alergias</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground font-medium">Alertas en tiempo real basadas en IA para prevenir el consumo de alérgenos.</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md bg-background/50 p-4">
                <CardHeader>
                  <div className="bg-primary/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-4">
                    <Tablet className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="font-black">POS Ultra Rápido</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground font-medium">Cobros con NFC en menos de 2 segundos. Ideal para el flujo intenso del recreo.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-white">
        <p className="text-xs text-muted-foreground font-bold">© 2024 NutriPass SaaS. Todos los derechos reservados.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Privacidad
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Contacto
          </Link>
        </nav>
      </footer>
    </div>
  );
}
