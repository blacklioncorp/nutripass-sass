'use client';

import React, { useState } from 'react';
import { UserPlus, Mail, Shield, X, CheckCircle2, Copy } from 'lucide-react';
import { createSchoolStaff } from '@/app/(dashboard)/school/staff/actions';

export default function StaffModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isSaving, setIsSaving] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createSchoolStaff(formData);

    if (result.success) {
      setTempPassword(result.tempPassword || '******');
    } else {
      setError(result.error || 'Error al invitar al empleado.');
    }
    setIsSaving(false);
  }

  const copyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1a3a5c]/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-[#e8f0f7] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-[#e8f0f7] flex justify-between items-center bg-[#f8fafc]">
          <div>
            <h3 className="text-xl font-black text-[#1a3a5c] tracking-tight">➕ Invitar Empleado</h3>
            <p className="text-[#8aa8cc] text-[10px] font-bold uppercase tracking-widest mt-1">Alta de Personal Operativo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-8">
          {tempPassword ? (
            <div className="text-center space-y-6 py-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="h-20 w-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="h-10 w-10 font-bold" />
               </div>
               <div>
                  <h4 className="text-2xl font-black text-[#1a3a5c] tracking-tight italic">¡Empleado Invitado!</h4>
                  <p className="text-slate-500 text-sm font-medium mt-2">
                    Copia esta contraseña temporal para el nuevo integrante. <br/>Deberá cambiarla en su primer inicio de sesión.
                  </p>
               </div>
               
               <div className="bg-[#f0f9ff] border-2 border-dashed border-[#bae6fd] p-6 rounded-2xl flex items-center justify-between">
                  <span className="font-mono text-xl font-black text-[#0369a1] tracking-widest">{tempPassword}</span>
                  <button onClick={copyPassword} className="p-3 bg-white text-[#0369a1] rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all">
                    <Copy className="h-5 w-5" />
                  </button>
               </div>

               <button 
                  onClick={() => { setTempPassword(null); onClose(); }} 
                  className="w-full bg-[#1a3a5c] text-white font-black py-5 rounded-2xl hover:bg-[#0d1f3c] transition-all"
               >
                  ENTENDIDO, CERRAR
               </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black text-[#8aa8cc] uppercase tracking-widest px-1">
                  <UserPlus className="h-3 w-3" /> Nombre Completo
                </label>
                <input 
                  required
                  name="full_name"
                  placeholder="Ej: María García"
                  className="w-full bg-[#f8fafc] border-2 border-transparent focus:border-[#7CB9E8] focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-[#1a3a5c] transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black text-[#8aa8cc] uppercase tracking-widest px-1">
                  <Mail className="h-3 w-3" /> Correo Electrónico
                </label>
                <input 
                  required
                  type="email"
                  name="email"
                  placeholder="empleado@colegio.edu.mx"
                  className="w-full bg-[#f8fafc] border-2 border-transparent focus:border-[#7CB9E8] focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-[#1a3a5c] transition-all outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black text-[#8aa8cc] uppercase tracking-widest px-1">
                  <Shield className="h-3 w-3" /> Rol en el Sistema
                </label>
                <select 
                  name="role"
                  className="w-full bg-[#f8fafc] border-2 border-transparent focus:border-[#7CB9E8] focus:bg-white rounded-2xl px-6 py-4 text-sm font-bold text-[#1a3a5c] transition-all outline-none appearance-none cursor-pointer"
                >
                  <option value="staff">Staff (Cocina / Caja)</option>
                  <option value="school_admin">Administrador (Gestión total)</option>
                </select>
              </div>

              {error && (
                <div className="p-4 bg-red-50 text-red-600 text-[10px] font-black uppercase rounded-xl border border-red-100 flex items-center gap-2">
                   ⚠️ {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={isSaving}
                className="w-full bg-[#1a3a5c] text-white font-black py-5 rounded-2xl hover:bg-[#0d1f3c] transition-all shadow-xl shadow-blue-900/10 active:scale-95 disabled:opacity-50 mt-4"
              >
                {isSaving ? (
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  'ENVIAR INVITACIÓN'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
