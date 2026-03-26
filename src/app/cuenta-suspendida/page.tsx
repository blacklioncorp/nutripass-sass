import Link from 'next/link';

export default function SuspendedAccountPage() {
  return (
    <div className="min-h-screen bg-[#f0f5fb] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center border border-red-100">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🚫</span>
        </div>
        <h1 className="text-3xl font-black text-[#1a3a5c] tracking-tight mb-4">
          Cuenta Suspendida
        </h1>
        <p className="text-[#8aa8cc] font-medium mb-8 leading-relaxed">
          El acceso a este colegio ha sido restringido temporalmente por el administrador de NutriPass. 
          Por favor, contacta a soporte para regularizar tu situación.
        </p>
        <div className="space-y-4">
          <a 
            href="mailto:soporte@nutripass.com" 
            className="block w-full bg-[#004B87] text-white font-black py-4 rounded-xl hover:bg-[#003870] transition shadow-md"
          >
            Contactar a Soporte
          </a>
          <Link 
            href="/login" 
            className="block w-full text-[#8aa8cc] font-bold py-2 hover:text-[#1a3a5c] transition"
          >
            Cerrar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
