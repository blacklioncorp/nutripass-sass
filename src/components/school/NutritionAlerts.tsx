'use client';

import { AlertCircle, User, Info, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NutritionAlertsProps {
  alerts: {
    id: string;
    special_instructions: string | null;
    has_allergy_override: boolean;
    consumers: { first_name: string; last_name: string; allergies: string[] };
    daily_menus: { main_course_name: string } | null;
    products: { name: string } | null;
  }[];
}

export default function NutritionAlerts({ alerts }: NutritionAlertsProps) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[2rem]">
        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
            <Utensils className="h-8 w-8 text-slate-300" />
        </div>
        <h3 className="text-[#1a3a5c] font-black text-lg">Todo bajo control</h3>
        <p className="text-[#8aa8cc] text-xs font-bold uppercase tracking-widest mt-1">Sin alertas activas para hoy</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
      {alerts.map((alert) => {
        const itemName = alert.daily_menus?.main_course_name || alert.products?.name || 'Producto';
        const studentName = `${alert.consumers.first_name} ${alert.consumers.last_name}`;
        const isCritical = alert.has_allergy_override;

        return (
          <div 
            key={alert.id}
            className={cn(
              "p-5 rounded-3xl border transition-all duration-300 group",
              isCritical 
                ? "bg-red-50 border-red-200 border-l-4 border-l-red-500 shadow-md" 
                : "bg-white border-slate-100 hover:border-amber-200 hover:shadow-lg"
            )}
          >
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                        isCritical ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                    )}>
                        {isCritical ? <AlertCircle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
                    </div>
                    <span className={cn(
                        "text-[10px] font-black uppercase tracking-widest",
                        isCritical ? "text-red-600" : "text-amber-600"
                    )}>
                        {isCritical ? 'Omisión de Alergia' : 'Instrucción Especial'}
                    </span>
                </div>
                <span className="text-[10px] font-black text-slate-300 uppercase">Hoy</span>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-sm font-black text-[#1a3a5c]">{studentName}</span>
                </div>

                <div className={cn(
                    "p-3 rounded-2xl flex items-center gap-2",
                    isCritical ? "bg-white/60 border border-red-50 text-red-900" : "bg-slate-50 text-slate-700"
                )}>
                    <Utensils className="h-3 w-3 opacity-50" />
                    <span className="text-xs font-bold italic truncate">{itemName}</span>
                </div>

                {alert.special_instructions && (
                    <div className="mt-2 p-3 bg-white/40 border border-dashed border-red-200 rounded-xl">
                        <p className="text-[10px] font-black text-red-500 uppercase flex items-center gap-1 mb-1">
                            <Info className="h-3 w-3" /> Nota del Padre:
                        </p>
                        <p className="text-xs font-black text-red-700 italic leading-tight uppercase">
                            "{alert.special_instructions}"
                        </p>
                    </div>
                )}

                {alert.consumers.allergies.length > 0 && isCritical && (
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest">
                            Alergia: {alert.consumers.allergies.join(', ')}
                        </span>
                    </div>
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
