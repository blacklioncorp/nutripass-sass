'use client';

import React, { useState } from 'react';
import { UserPlus } from 'lucide-react';
import StaffModal from './StaffModal';

export default function StaffModalOpener() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-3 bg-[#1a3a5c] text-white px-10 py-5 rounded-[2.5rem] font-black text-sm hover:bg-[#0d1f3c] transition-all shadow-xl shadow-blue-900/10 active:scale-95 group shrink-0"
      >
        <UserPlus className="h-5 w-5 text-[#7CB9E8] group-hover:translate-y-0.5 transition-transform" />
        ➕ AÑADIR EMPLEADO
      </button>

      <StaffModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}
