'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ParentProfileModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: any;
  userEmail: string | undefined;
  needsOnboarding?: boolean;
}

export default function ParentProfileModal({
  isOpen,
  onOpenChange,
  userProfile,
  userEmail,
  needsOnboarding,
}: ParentProfileModalProps) {
  const [editingName, setEditingName] = useState(userProfile?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSaveProfile = async () => {
    if (!editingName.trim()) {
      setError('Por favor ingresa tu nombre completo.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/parent/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: editingName.trim(),
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Error al guardar el perfil');
      }

      // Éxito: cerrar y refrescar
      onOpenChange(false);
      router.refresh();
      
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Ocurrió un error inesperado al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        // Bloquear cierre si es onboarding obligatorio
        if (needsOnboarding && !open) return;
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md bg-white rounded-3xl p-8 border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-black text-[#004B87] tracking-tight">
            {needsOnboarding ? '¡Bienvenido a SafeLunch!' : 'Configuración de Perfil'}
          </DialogTitle>
          <DialogDescription className="text-base text-[#8aa8cc] font-medium mt-1">
            {needsOnboarding
              ? 'Para comenzar, dinos cómo llamararte. Este nombre aparecerá en tus recibos y notificaciones.'
              : 'Actualiza tu nombre completo para personalizar tu experiencia y los recibos.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-[#8aa8cc] uppercase tracking-widest ml-1">
              Nombre Completo
            </label>
            <input
              type="text"
              value={editingName}
              onChange={(e) => {
                setEditingName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ej. Familia Pérez"
              className={`w-full px-5 py-4 text-lg font-bold text-[#004B87] border-2 rounded-2xl focus:outline-none transition-all placeholder:text-[#b0c8e0] bg-[#f8fafd] ${
                error ? 'border-red-400 focus:border-red-500' : 'border-[#f0f5fb] focus:border-[#7CB9E8]'
              }`}
              autoFocus={needsOnboarding}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-[#8aa8cc] uppercase tracking-widest ml-1">
              Correo (Cuenta)
            </label>
            <input
              type="email"
              disabled
              value={userEmail || ''}
              className="w-full px-5 py-4 text-lg font-bold text-[#b0c8e0] bg-[#f0f5fb] border-2 border-[#f0f5fb] rounded-2xl cursor-not-allowed"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2 duration-300">
              <span className="flex-shrink-0">⚠️</span>
              {error}
            </div>
          )}
        </div>

        <button
          onClick={handleSaveProfile}
          disabled={isSaving || !editingName.trim()}
          className="mt-8 w-full bg-[#004B87] hover:bg-[#003870] text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/10 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-3 text-lg uppercase tracking-wide"
        >
          {isSaving ? (
            <>
              <RefreshCcw className="h-5 w-5 animate-spin" /> Guardando...
            </>
          ) : (
            <>{needsOnboarding ? 'Comenzar →' : 'Guardar Cambios'}</>
          )}
        </button>
      </DialogContent>
    </Dialog>
  );
}
