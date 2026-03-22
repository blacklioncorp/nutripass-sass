import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, ShieldCheck, Utensils, Tablet, School } from 'lucide-react';

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
          <Link className="text-sm font-medium hover:underline underline-offset-4" href="/login">
            Ingresar
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
              <div className="space-y-2">
                <h1 className="text-3xl font-headline font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Gestión Inteligente de Comedores Escolares
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  Conectando padres, escuelas y cafeterías para una alimentación escolar segura, rápida y sin efectivo.
                </p>
              </div>
              <div className="space-x-4">
                <Button size="lg" className="bg-primary text-foreground hover:bg-primary/90" asChild>
                  <Link href="/dashboard/pos">Ir al POS (Cafetería)</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/dashboard/parent">Portal de Padres</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-none shadow-md bg-background/50">
                <CardHeader>
                  <Wallet className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Billetera Digital</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Recargas instantáneas y control de saldos diferenciados para almuerzos y snacks.</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md bg-background/50">
                <CardHeader>
                  <ShieldCheck className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>Control de Alergias</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Alertas en tiempo real basadas en IA para prevenir el consumo de alérgenos.</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md bg-background/50">
                <CardHeader>
                  <Tablet className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>POS Ultra Rápido</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Cobros con NFC en menos de 2 segundos. Ideal para el flujo intenso del recreo.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-white">
        <p className="text-xs text-muted-foreground">© 2024 NutriPass SaaS. Todos los derechos reservados.</p>
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