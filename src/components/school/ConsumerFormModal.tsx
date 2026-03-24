'use client';

import { useActionState, useState, useEffect } from 'react';
import { createConsumer, updateConsumer } from '@/app/(dashboard)/school/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ConsumerFormModalProps {
  consumer?: any;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export default function ConsumerFormModal({ consumer, trigger, onSuccess }: ConsumerFormModalProps) {
  const [open, setOpen] = useState(false);
  const isEditing = !!consumer;
  
  const [consumerType, setConsumerType] = useState<'student' | 'staff'>(
    consumer?.type || 'student'
  );

  const [state, formAction, isPending] = useActionState(
    isEditing ? updateConsumer : createConsumer, 
    null
  );

  useEffect(() => {
    if (state?.success) {
      setOpen(false);
      onSuccess?.();
    }
  }, [state, onSuccess]);

  // Reset type if consumer changes
  useEffect(() => {
    if (consumer) {
      setConsumerType(consumer.type);
    }
  }, [consumer]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="bg-primary text-white font-bold px-4 py-2 rounded-xl shadow hover:opacity-90 transition">
            + Nuevo Registro
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black text-slate-900">
            {isEditing ? 'Editar Usuario' : 'Registrar Usuario'}
          </DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4 mt-4">
          {/* Hidden ID for editing */}
          {isEditing && <input type="hidden" name="id" value={consumer.id} />}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nombre(s)</label>
              <input 
                name="firstName" 
                required 
                defaultValue={consumer?.first_name}
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary transition" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Apellidos</label>
              <input 
                name="lastName" 
                required 
                defaultValue={consumer?.last_name}
                className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary transition" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Matrícula / ID Empleado</label>
              <input 
                name="identifier" 
                required 
                defaultValue={consumer?.identifier}
                className="w-full p-2 border border-slate-200 rounded-lg font-code focus:outline-none focus:border-primary transition" 
              />
            </div>
            {consumerType === 'student' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Grado / Grupo</label>
                <input 
                  name="grade" 
                  placeholder="ej. 4° A" 
                  defaultValue={consumer?.grade}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary transition" 
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Tipo de Usuario</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                <input 
                  type="radio" 
                  name="type" 
                  value="student" 
                  checked={consumerType === 'student'} 
                  onChange={() => setConsumerType('student')}
                  className="accent-primary" 
                />
                <span className="font-bold">Alumno</span>
              </label>
              <label className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                <input 
                  type="radio" 
                  name="type" 
                  value="staff" 
                  checked={consumerType === 'staff'} 
                  onChange={() => setConsumerType('staff')}
                  className="accent-primary" 
                />
                <span className="font-bold">Personal / Docente</span>
              </label>
            </div>
          </div>

          {/* parent_email: only for students */}
          {consumerType === 'student' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Correo del Padre / Tutor
                <span className="ml-2 text-xs text-slate-400 font-normal">(vinculación)</span>
              </label>
              <input
                name="parentEmail"
                type="email"
                defaultValue={consumer?.parent_email}
                placeholder="ej. papa@gmail.com"
                className="w-full p-2.5 border border-slate-200 rounded-lg text-sm placeholder:text-slate-300 focus:outline-none focus:border-primary transition"
              />
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                El padre debe registrarse con este email para ver el perfil de su hijo.
              </p>
            </div>
          )}

          {state?.error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 animate-pulse">
              {state.error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button 
              type="button" 
              onClick={() => setOpen(false)} 
              className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isPending} 
              className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-slate-800 transition shadow-sm"
            >
              {isPending ? 'Guardando...' : isEditing ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
