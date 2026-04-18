'use client';

import { useState } from 'react';
import BulkUpload from './BulkUpload';
import ConsumerFormModal from './ConsumerFormModal';
import VinculacionModal from './VinculacionModal';

export default function ConsumersManager({ initialConsumers }: { initialConsumers: any[] }) {
  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConsumerForNfc, setSelectedConsumerForNfc] = useState<any | null>(null);

  const source = initialConsumers;

  const students = source.filter(c => (c.consumer_type === 'student' || c.type === 'student'));
  const staff = source.filter(c => (c.consumer_type === 'staff' || c.type === 'staff'));
  const displayList = (activeTab === 'student' ? students : staff).filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.identifier?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8aa8cc]">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre o ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[#e8f0f7] rounded-xl text-sm text-[#1a3a5c] placeholder-[#b0c8e0] focus:outline-none focus:border-[#3b82f6] bg-white shadow-sm"
            />
          </div>
          {/* Actions */}
          <div className="flex gap-3">
            <BulkUpload />
            <ConsumerFormModal />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-3">
          <button
            onClick={() => setActiveTab('student')}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition border ${activeTab === 'student' ? 'bg-[#e8f0f7] text-[#2b5fa6] border-[#2b5fa6]' : 'bg-white text-[#8aa8cc] border-[#e8f0f7] hover:bg-[#f0f5fb]'}`}
          >
            ALUMNOS ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-6 py-2 rounded-xl font-bold text-sm transition border ${activeTab === 'staff' ? 'bg-[#e8f0f7] text-[#2b5fa6] border-[#2b5fa6]' : 'bg-white text-[#8aa8cc] border-[#e8f0f7] hover:bg-[#f0f5fb]'}`}
          >
            PERSONAL ({staff.length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e8f0f7] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#f0f5fb] text-[#8aa8cc] text-[11px] font-black uppercase tracking-widest border-b border-[#e8f0f7]">
                <th className="px-6 py-4">Nombre Completo</th>
                <th className="px-6 py-4">Identificador</th>
                <th className="px-6 py-4">Grado</th>
                <th className="px-6 py-4">NFC Tag</th>
                <th className="px-6 py-4">Saldo</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-[#8aa8cc] font-medium">
                    No se encontraron {activeTab === 'student' ? 'alumnos' : 'empleados'}.
                  </td>
                </tr>
              ) : displayList.map(c => {
                const balance = c.wallets?.reduce((sum: number, w: any) => sum + parseFloat(w.balance || 0), 0) || 0;
                const isActive = (c.status || 'active') === 'active';

                return (
                  <tr key={c.id} className="border-b border-[#f0f5fb] hover:bg-[#f8fafd] transition">
                    <td className="px-6 py-5 font-black text-[#1a3a5c]">
                      {c.first_name} {c.last_name}
                    </td>
                    <td className="px-6 py-5 text-[#4a6fa5] font-mono text-sm">
                      {c.identifier || '—'}
                    </td>
                    <td className="px-6 py-5 text-[#4a6fa5] text-sm font-semibold">
                      {c.grade || '—'}
                    </td>
                    <td className="px-6 py-5">
                      {c.nfc_tag_uid ? (
                        <button 
                          onClick={() => setSelectedConsumerForNfc(c)}
                          className="bg-[#e8f0f7] text-[#2b5fa6] font-mono text-xs px-3 py-1.5 rounded-full font-bold hover:bg-[#d0e1f0] transition"
                        >
                          {c.nfc_tag_uid}
                        </button>
                      ) : (
                        <button 
                          onClick={() => setSelectedConsumerForNfc(c)}
                          className="text-[#3b82f6] text-xs font-black flex items-center gap-1 hover:underline transition"
                        >
                          🏷️ VINCULAR
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`font-black text-base ${balance < 0 ? 'text-red-500' : 'text-[#1a3a5c]'}`}>
                        ${balance.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-black ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {isActive ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ConsumerFormModal 
                          consumer={c} 
                          trigger={
                            <button className="text-[#8aa8cc] hover:text-[#2b5fa6] transition p-1.5 rounded-lg hover:bg-[#e8f0f7]" title="Editar">
                              ✏️
                            </button>
                          }
                        />
                        <button className="text-[#8aa8cc] hover:text-[#2b5fa6] transition p-1.5 rounded-lg hover:bg-[#e8f0f7]" title="Más opciones">⋮</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedConsumerForNfc && (
        <VinculacionModal
          isOpen={!!selectedConsumerForNfc}
          onClose={() => setSelectedConsumerForNfc(null)}
          consumer={selectedConsumerForNfc}
        />
      )}
    </div>
  );
}
