import BrandSettingsForm from '@/components/admin/BrandSettingsForm';

export default function SchoolSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuración de Marca (White-Label)</h1>
        <p className="text-slate-500 mt-2">Personaliza la apariencia de tu portal NutriPass subiendo el escudo de tu colegio y ajustando los colores institucionales.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <BrandSettingsForm />
      </div>
    </div>
  );
}
