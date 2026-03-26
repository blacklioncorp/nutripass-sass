'use client';

import { useState, useMemo } from 'react';
import WeeklyPreOrder from './WeeklyPreOrder';

export default function PreordersClient({ 
  initialConsumers, 
  dailyMenus, 
  existingPreorders 
}: { 
  initialConsumers: any[], 
  dailyMenus: any[], 
  existingPreorders: any[] 
}) {
  const [activeStudentId, setActiveStudentId] = useState<string>(initialConsumers[0]?.id ?? '');

  const activeConsumer = useMemo(
    () => initialConsumers.find(c => c.id === activeStudentId) ?? initialConsumers[0],
    [initialConsumers, activeStudentId]
  );

  if (!activeConsumer) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
        <h2 className="text-xl font-black text-slate-900">No tienes alumnos vinculados aún.</h2>
        <p className="text-slate-500 font-medium mt-2">Contacta a la escuela para que vinculen a tu hijo a esta cuenta de correo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Student Selector (Same style as Dashboard) */}
      {initialConsumers.length > 1 && (
        <div className="flex bg-white rounded-full p-1 shadow-sm border border-slate-100 flex-wrap gap-1 w-fit">
          {initialConsumers.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveStudentId(c.id)}
              className={`px-6 py-2.5 rounded-full font-black text-sm transition-all duration-300 ${
                activeStudentId === c.id
                  ? 'bg-primary text-white shadow-md shadow-blue-200'
                  : 'text-slate-400 hover:text-primary hover:bg-slate-50'
              }`}
            >
              {c.first_name} {c.last_name}
            </button>
          ))}
        </div>
      )}

      <WeeklyPreOrder 
        consumer={activeConsumer} 
        dailyMenus={dailyMenus.filter(m => m.school_id === activeConsumer.school_id)} 
        existingPreorders={existingPreorders.filter(p => p.consumer_id === activeConsumer.id)} 
      />
    </div>
  );
}
