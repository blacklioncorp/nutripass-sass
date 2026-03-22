import POSScanner from '@/components/pos/POSScanner';
import Link from 'next/link';
import { Utensils } from 'lucide-react';

export default function POSPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 h-16 flex items-center bg-white border-b shadow-sm">
        <Link className="flex items-center gap-2" href="/">
          <div className="bg-primary p-1.5 rounded-lg">
            <Utensils className="h-5 w-5 text-foreground" />
          </div>
          <span className="text-lg font-headline font-bold text-foreground">NutriPass POS</span>
        </Link>
        <div className="ml-auto flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <span>Sede: Escuela San Agustín</span>
          <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
          <span>Usuario: Cafetería Central</span>
        </div>
      </header>
      <main className="flex-1">
        <POSScanner />
      </main>
    </div>
  );
}