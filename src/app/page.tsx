import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-lg w-full">
        <h1 className="text-4xl font-black text-slate-900 mb-2">SafeLunch</h1>
        <p className="text-slate-500 mb-8">Gestión inteligente de cobros y nutrición escolar.</p>
        
        <div className="flex flex-col gap-4">
          <Link href="/login" className="bg-primary text-primary-foreground text-white font-bold py-3 px-6 rounded-xl shadow hover:opacity-90 transition">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
