'use client';

import React, { useState } from 'react';
import { User, ShieldCheck, Shield, Trash2, Calendar, MoreVertical } from 'lucide-react';
import { deleteStaffMember } from '@/app/(dashboard)/school/staff/actions';

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  created_at: string;
  email?: string; // We'll try to join it or use metadata
}

export default function StaffList({ staff }: { staff: any[] }) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar a este empleado? Esta acción es irreversible.')) return;
    
    setIsDeleting(userId);
    const result = await deleteStaffMember(userId);
    if (!result.success) {
      alert('Error: ' + result.error);
    }
    setIsDeleting(null);
  };

  return (
    <div className="bg-white rounded-[3rem] border border-[#e8f0f7] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f8fafc] border-b border-[#e8f0f7]">
              <th className="px-8 py-6 text-[10px] font-black text-[#8aa8cc] uppercase tracking-widest whitespace-nowrap">Empleado</th>
              <th className="px-8 py-6 text-[10px] font-black text-[#8aa8cc] uppercase tracking-widest whitespace-nowrap">Rol Institucional</th>
              <th className="px-8 py-6 text-[10px] font-black text-[#8aa8cc] uppercase tracking-widest whitespace-nowrap">Fecha de Alta</th>
              <th className="px-8 py-6 text-[10px] font-black text-[#8aa8cc] uppercase tracking-widest whitespace-nowrap text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {staff.map((member) => (
              <tr key={member.id} className="hover:bg-[#f8fafc]/50 transition-colors group">
                <td className="px-8 py-6 whitespace-nowrap">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-[#f0f5fb] text-[#2b5fa6] flex items-center justify-center font-black text-lg shadow-sm border border-white">
                      {member.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#1a3a5c] tracking-tight">{member.full_name}</p>
                      <p className="text-[11px] text-[#8aa8cc] font-medium">{member.roles?.email || 'Vínculo activo'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    member.role === 'admin' 
                    ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                  }`}>
                    {member.role === 'admin' ? <ShieldCheck className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    {member.role === 'admin' ? 'Administrador' : 'Staff Operativo'}
                  </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Calendar className="h-3.5 w-3.5 text-[#8aa8cc]" />
                    {new Date(member.updated_at || Date.now()).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </td>
                <td className="px-8 py-6 whitespace-nowrap text-right">
                  <button 
                    onClick={() => handleDelete(member.id)}
                    disabled={isDeleting === member.id}
                    className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all disabled:opacity-50"
                  >
                    {isDeleting === member.id ? (
                      <div className="h-4 w-4 border-2 border-red-200 border-t-red-500 rounded-full animate-spin mx-auto" />
                    ) : (
                      <Trash2 className="h-5 w-5" />
                    )}
                  </button>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center">
                  <div className="max-w-xs mx-auto">
                    <div className="h-16 w-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-200">
                        <User className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest italic">Sin empleados registrados</p>
                    <p className="text-xs text-slate-400 mt-2 font-medium leading-relaxed">
                      Utiliza el botón de arriba para invitar a tu primer colaborador al sistema.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
