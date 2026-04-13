'use client';

import { useActionState, useState, useEffect } from 'react';
import { createSchoolWithAdmin } from '@/app/(dashboard)/master/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function CreateSchoolModal() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createSchoolWithAdmin, null);

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="bg-primary text-white px-4 py-2 rounded-xl font-bold shadow hover:bg-blue-700 transition">
          + Nueva Escuela
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">Registrar Nuevo Colegio</DialogTitle>
        </DialogHeader>
        
        <form action={formAction} className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Comercial</label>
            <input 
              name="schoolName" 
              required 
              placeholder="Colegio Cumbres"
              className="w-full p-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Subdominio (URL)</label>
            <div className="flex items-center">
              <input 
                name="subdomain" 
                required 
                placeholder="cumbres"
                pattern="[a-z0-9\-]+"
                className="w-full p-2 border rounded-l-lg text-right"
              />
              <span className="bg-slate-100 p-2 border border-l-0 rounded-r-lg text-slate-500">.safelunch.com</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Comisión Negociada (%)</label>
            <input 
              type="number"
              name="commissionPercentage" 
              required 
              defaultValue="5.0"
              step="0.1"
              min="0"
              max="100"
              className="w-full p-2 border rounded-lg"
            />
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-bold text-slate-900 mb-2">Administrador Principal</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre Completo</label>
                <input 
                  name="adminName" 
                  required 
                  placeholder="Juan Pérez"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Correo Electrónico</label>
                <input 
                  type="email"
                  name="adminEmail" 
                  required 
                  placeholder="admin@colegio.edu"
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Contraseña Temporal</label>
                <input 
                  type="password"
                  name="adminPassword" 
                  required 
                  placeholder="********"
                  minLength={6}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>
          </div>

          {state?.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {state.error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg disabled:opacity-50">
              {isPending ? 'Creando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
