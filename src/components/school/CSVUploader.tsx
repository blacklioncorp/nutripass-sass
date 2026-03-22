'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

interface CSVRow {
  Nombre?: string;
  Apellido?: string;
  Matricula?: string;
  Tipo?: string;
}

export default function CSVUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('No user context');
  
          const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();
          if (!profile?.school_id) throw new Error('No admin role');
  
          const consumersToInsert = results.data.map((row) => ({
            school_id: profile.school_id,
            first_name: row.Nombre || 'Desconocido',
            last_name: row.Apellido || 'Desconocido',
            identifier: row.Matricula || null,
            type: (row.Tipo)?.toLowerCase() === 'staff' ? 'staff' : 'student',
            is_active: true
          }));
  
          // Mass Insert consumers
          const { data: newConsumers, error } = await supabase
            .from('consumers')
            .insert(consumersToInsert)
            .select();
  
          if (error) throw error;
  
          // Create wallets for all inserts using a secondary query
          if (newConsumers && newConsumers.length > 0) {
            const walletsToInsert = newConsumers.map(c => ({
              consumer_id: c.id,
              type: 'comedor',
              balance: 0.00
            }));
            await supabase.from('wallets').insert(walletsToInsert);
          }
  
          alert(`¡${consumersToInsert.length} usuarios registrados exitosamente!`);
          router.refresh();
        } catch (err: any) {
          alert('Error procesando CSV: ' + err.message);
        } finally {
          setIsUploading(false);
          // reset input
          e.target.value = '';
        }
      }
    });
  };

  return (
    <label className={`bg-slate-100 text-slate-700 font-bold px-4 py-2 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:bg-slate-200 transition ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
      {isUploading ? 'Procesando CSV...' : '📥 Importar CSV'}
      <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
    </label>
  );
}
