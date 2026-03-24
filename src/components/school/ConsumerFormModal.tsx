'use client';

import { useActionState, useState, useEffect } from 'react';
import { createConsumer } from '@/app/(dashboard)/school/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function ConsumerFormModal() {
  const [open, setOpen] = useState(false);
  const [consumerType, setConsumerType] = useState<'student' | 'staff'>('student');
  const [state, formAction, isPending] = useActionState(createConsumer, null);

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="bg-primary text-white font-bold px-4 py-2 rounded-xl shadow hover:opacity-90 transition">
          + Nuevo Registro
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900">Registrar Usuario</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nombre(s)</label>
              <input name="firstName" required className="w-full p-2 border border-slate-200 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Apellidos</label>
              <input name="lastName" required className="w-full p-2 border border-slate-200 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Matrícula / ID Empleado</label>
              <input name="identifier" required className="w-full p-2 border border-slate-200 rounded-lg font-code" />
            </div>
            {consumerType === 'student' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Grado / Grupo</label>
                <input name="grade" placeholder="ej. 4° A" className="w-full p-2 border border-slate-200 rounded-lg" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Usuario</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                <input type="radio" name="type" value="student" defaultChecked className="accent-primary" onChange={() => setConsumerType('student')} />
                <span className="font-bold">Alumno</span>
              </label>
              <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                <input type="radio" name="type" value="staff" className="accent-primary" onChange={() => setConsumerType('staff')} />
                <span className="font-bold">Personal / Docente</span>
              </label>
            </div>
          </div>

          {/* parent_email: only for students */}
          {consumerType === 'student' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Correo del Padre / Tutor
                <span className="ml-2 text-xs text-slate-400 font-normal">(para vincular automáticamente)</span>
              </label>
              <input
                name="parentEmail"
                type="email"
                placeholder="ej. papa@gmail.com"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm placeholder:text-slate-300 focus:outline-none focus:border-blue-400 transition"
              />
              <p className="text-xs text-slate-400 mt-1">Cuando el padre inicie sesión con este correo, verá automáticamente a su hijo en su portal.</p>
            </div>
          )}

          {state?.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
              {state.error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg disabled:opacity-50">
              {isPending ? 'Guardando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
