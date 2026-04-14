'use client';

import { useState } from 'react';
import { 
  DollarSign, 
  Clock, 
  ShieldAlert, 
  Users, 
  Save, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { updateSchoolSettingsJSONB } from '@/app/(dashboard)/school/settings/actions';

interface SchoolSettingsPanelProps {
  initialSettings: any;
}

export default function SchoolSettingsPanel({ initialSettings }: SchoolSettingsPanelProps) {
  const [settings, setSettings] = useState(initialSettings || {
    financial: {
      overdraft_limit: 50,
      apply_convenience_fee: true,
      convenience_fee_amount: 5
    },
    operational: {
      preorder_cutoff_time: "09:00",
      pos_open_time: "07:00",
      pos_close_time: "15:00"
    },
    medical_and_rules: {
      allergy_hard_stop: true,
      require_food_for_snacks: false
    },
    staff: {
      apply_staff_discount: true,
      staff_discount_percentage: 15
    }
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await updateSchoolSettingsJSONB(settings);
      if (result.success) {
        setMessage({ type: 'success', text: 'Configuración actualizada exitosamente.' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al actualizar.' });
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (section: string, field: string, value: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Financial Section */}
      <div className="bg-white rounded-[2.5rem] border border-[#e8f0f7] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-[#f0f5fb] flex items-center gap-4 bg-emerald-50/30">
          <div className="h-12 w-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-[#1a3a5c] font-black text-xl tracking-tight">Reglas Financieras</h2>
            <p className="text-[#8aa8cc] text-[10px] font-bold uppercase tracking-widest">Gestión de créditos y comisiones</p>
          </div>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-black text-[#1a3a5c] uppercase tracking-widest mb-2 block">Límite de Sobregiro (Fondo de Cortesía)</span>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8aa8cc] font-black text-sm">$</span>
                <input 
                  type="number" 
                  value={settings.financial.overdraft_limit}
                  onChange={(e) => updateSection('financial', 'overdraft_limit', parseFloat(e.target.value))}
                  className="w-full pl-8 pr-4 py-4 bg-[#f8fafd] border border-[#e8f0f7] rounded-2xl text-[#1a3a5c] font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  placeholder="50.00"
                />
              </div>
              <p className="text-[10px] text-[#8aa8cc] mt-2 font-medium italic">Permite que el alumno consuma hasta esta cantidad si su saldo llega a cero.</p>
            </label>
          </div>
          <div className="flex flex-col justify-center gap-6 bg-[#f8fafd] p-6 rounded-[2rem] border border-[#e8f0f7]">
            <div className="flex items-center justify-between">
               <div>
                  <p className="text-sm font-black text-[#1a3a5c]">Cobrar Comisión por Gestión</p>
                  <p className="text-[10px] text-[#8aa8cc] font-bold uppercase">$5.00 MXN por sobregiro</p>
               </div>
               <button 
                 onClick={() => updateSection('financial', 'apply_convenience_fee', !settings.financial.apply_convenience_fee)}
                 className={`w-14 h-8 rounded-full transition-all relative ${settings.financial.apply_convenience_fee ? 'bg-emerald-500 shadow-md' : 'bg-slate-200'}`}
               >
                 <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.financial.apply_convenience_fee ? 'left-7' : 'left-1'}`} />
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Section */}
      <div className="bg-white rounded-[2.5rem] border border-[#e8f0f7] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-[#f0f5fb] flex items-center gap-4 bg-blue-50/30">
          <div className="h-12 w-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-[#1a3a5c] font-black text-xl tracking-tight">Logística y Horarios</h2>
            <p className="text-[#8aa8cc] text-[10px] font-bold uppercase tracking-widest">Cortes de pedido y atención POS</p>
          </div>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <label className="block">
            <span className="text-xs font-black text-[#1a3a5c] uppercase tracking-widest mb-2 block">Hora Límite Pre-orden</span>
            <input 
              type="time" 
              value={settings.operational.preorder_cutoff_time}
              onChange={(e) => updateSection('operational', 'preorder_cutoff_time', e.target.value)}
              className="w-full px-4 py-4 bg-[#f8fafd] border border-[#e8f0f7] rounded-2xl text-[#1a3a5c] font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black text-[#1a3a5c] uppercase tracking-widest mb-2 block">Apertura Cafetería</span>
            <input 
              type="time" 
              value={settings.operational.pos_open_time}
              onChange={(e) => updateSection('operational', 'pos_open_time', e.target.value)}
              className="w-full px-4 py-4 bg-[#f8fafd] border border-[#e8f0f7] rounded-2xl text-[#1a3a5c] font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black text-[#1a3a5c] uppercase tracking-widest mb-2 block">Cierre Cafetería</span>
            <input 
              type="time" 
              value={settings.operational.pos_close_time}
              onChange={(e) => updateSection('operational', 'pos_close_time', e.target.value)}
              className="w-full px-4 py-4 bg-[#f8fafd] border border-[#e8f0f7] rounded-2xl text-[#1a3a5c] font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </label>
        </div>
      </div>

      {/* Medical & Rules Section */}
      <div className="bg-white rounded-[2.5rem] border border-[#e8f0f7] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-[#f0f5fb] flex items-center gap-4 bg-red-50/30">
          <div className="h-12 w-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shadow-inner">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-[#1a3a5c] font-black text-xl tracking-tight">Seguridad Nutricional</h2>
            <p className="text-[#8aa8cc] text-[10px] font-bold uppercase tracking-widest">Bloqueos de alergias y restricciones</p>
          </div>
        </div>
        <div className="p-8 space-y-6">
           <div className="flex items-center justify-between p-6 bg-red-50/20 rounded-[2rem] border border-red-100 shadow-sm">
             <div className="flex items-center gap-4">
               <div className="h-10 w-10 bg-red-500 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg">!</div>
               <div>
                  <p className="text-sm font-black text-red-800">Bloqueo Estricto de Alergias</p>
                  <p className="text-[10px] text-red-400 font-bold uppercase">Impedir cobro si hay ingredientes en conflicto</p>
               </div>
             </div>
             <button 
               onClick={() => updateSection('medical_and_rules', 'allergy_hard_stop', !settings.medical_and_rules.allergy_hard_stop)}
               className={`w-14 h-8 rounded-full transition-all relative ${settings.medical_and_rules.allergy_hard_stop ? 'bg-red-500 shadow-md' : 'bg-slate-200'}`}
             >
               <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.medical_and_rules.allergy_hard_stop ? 'left-7' : 'left-1'}`} />
             </button>
           </div>

           <div className="flex items-center justify-between p-6 bg-[#f8fafd] rounded-[2rem] border border-[#e8f0f7]">
             <div className="flex items-center gap-4">
               <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600"><CheckCircle2 className="h-5 w-5" /></div>
               <div>
                  <p className="text-sm font-black text-[#1a3a5c]">Obligar Consumo de Comida para Snacks</p>
                  <p className="text-[10px] text-[#8aa8cc] font-bold uppercase">Solo permitir snacks si se compró el menú del día</p>
               </div>
             </div>
             <button 
               onClick={() => updateSection('medical_and_rules', 'require_food_for_snacks', !settings.medical_and_rules.require_food_for_snacks)}
               className={`w-14 h-8 rounded-full transition-all relative ${settings.medical_and_rules.require_food_for_snacks ? 'bg-[#1a3a5c] shadow-md' : 'bg-slate-200'}`}
             >
               <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.medical_and_rules.require_food_for_snacks ? 'left-7' : 'left-1'}`} />
             </button>
           </div>
        </div>
      </div>

      {/* Staff Section */}
      <div className="bg-white rounded-[2.5rem] border border-[#e8f0f7] shadow-sm overflow-hidden">
        <div className="p-8 border-b border-[#f0f5fb] flex items-center gap-4 bg-violet-50/30">
          <div className="h-12 w-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 shadow-inner">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-[#1a3a5c] font-black text-xl tracking-tight">Beneficios de Personal</h2>
            <p className="text-[#8aa8cc] text-[10px] font-bold uppercase tracking-widest">Descuentos para maestros y staff</p>
          </div>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="flex items-center justify-between p-6 bg-violet-50/20 rounded-[2rem] border border-violet-100">
             <div>
                <p className="text-sm font-black text-violet-800">Activar Descuento Staff</p>
                <p className="text-[10px] text-violet-400 font-bold uppercase">Aplicable en todas las compras POS</p>
             </div>
             <button 
               onClick={() => updateSection('staff', 'apply_staff_discount', !settings.staff.apply_staff_discount)}
               className={`w-14 h-8 rounded-full transition-all relative ${settings.staff.apply_staff_discount ? 'bg-violet-500 shadow-md' : 'bg-slate-200'}`}
             >
               <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.staff.apply_staff_discount ? 'left-7' : 'left-1'}`} />
             </button>
          </div>
          <label className="block">
            <span className="text-xs font-black text-[#1a3a5c] uppercase tracking-widest mb-2 block">Porcentaje de Descuento (%)</span>
            <div className="relative">
              <input 
                type="number" 
                value={settings.staff.staff_discount_percentage}
                onChange={(e) => updateSection('staff', 'staff_discount_percentage', parseFloat(e.target.value))}
                className="w-full pr-12 pl-4 py-4 bg-[#f8fafd] border border-[#e8f0f7] rounded-2xl text-[#1a3a5c] font-bold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                placeholder="15"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8aa8cc] font-black text-sm">%</span>
            </div>
          </label>
        </div>
      </div>

      {/* Safe Actions */}
      <div className="sticky bottom-8 z-20 flex flex-col items-center">
        {message && (
          <div className={`mb-4 px-6 py-3 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300 shadow-xl ${message.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
            {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="text-sm font-bold tracking-tight">{message.text}</span>
          </div>
        )}
        
        <button 
          onClick={handleSave}
          disabled={loading}
          className="bg-[#1a3a5c] text-white px-12 py-5 rounded-[2rem] font-black text-base shadow-2xl shadow-blue-900/20 hover:bg-[#004B87] hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 text-[#7CB9E8]" />}
          GUARDAR CONFIGURACIÓN INSTITUCIONAL
        </button>
      </div>
    </div>
  );
}
