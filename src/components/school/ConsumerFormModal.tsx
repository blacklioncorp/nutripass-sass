'use client';

import { useActionState, useState, useEffect, useRef } from 'react';
import { createConsumer, updateConsumer } from '@/app/(dashboard)/school/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { X } from 'lucide-react';

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

  // Allergen chip state
  const [allergies, setAllergies] = useState<string[]>(consumer?.allergies || []);
  const [allergyInput, setAllergyInput] = useState('');
  const allergyInputRef = useRef<HTMLInputElement>(null);

  const addAllergen = () => {
    const trimmed = allergyInput.trim();
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies(prev => [...prev, trimmed]);
    }
    setAllergyInput('');
  };

  const removeAllergen = (item: string) => setAllergies(prev => prev.filter(a => a !== item));

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
      setAllergies(consumer.allergies || []);
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
            <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
              <div>
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

              {/* Hidden field: comma-separated allergies for the server action */}
              <input type="hidden" name="allergies" value={allergies.join(',')} />
              <div>
                <label className="block text-sm font-bold text-red-600 mb-1">🚨 Alergias del Alumno</label>
                <div className="flex gap-2">
                  <input
                    ref={allergyInputRef}
                    type="text"
                    value={allergyInput}
                    onChange={e => setAllergyInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAllergen(); } }}
                    placeholder="ej. Gluten, Lácteos..."
                    className="flex-1 p-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:border-red-400 transition"
                  />
                  <button
                    type="button"
                    onClick={addAllergen}
                    className="px-3 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition"
                  >
                    + Agregar
                  </button>
                </div>
                {allergies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {allergies.map(al => (
                      <span key={al} className="flex items-center gap-1 bg-red-50 text-red-700 text-xs font-bold px-3 py-1 rounded-full border border-red-200">
                        {al}
                        <button type="button" onClick={() => removeAllergen(al)} className="text-red-400 hover:text-red-700 ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              <p className="text-[10px] text-slate-400 mt-1">
                  Escribe y presiona Enter o "+ Agregar". Esto bloqueará ventas incompatibles en el POS.
                </p>
              </div>
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
