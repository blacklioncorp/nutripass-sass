'use client';

import { useState, useMemo } from 'react';
import {
  Wallet, Zap, ShieldCheck, History, ChevronDown,
  RefreshCcw, AlertTriangle, Pencil, Star, TrendingUp, CreditCard,
  Utensils, Tag
} from 'lucide-react';
import type { Consumer, Transaction, Wallet as WalletType, UserProfile } from '@/app/(portal)/parent/page';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import WalletReload from './WalletReload';

// ─── Types ────────────────────────────────────────────────────────────────────
type Props = {
  consumers: Consumer[];
  transactions: Transaction[];
  userProfile: UserProfile | null;
  needsOnboarding?: boolean;
  userEmail?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatMoney(n: number) {
  return `$${Math.abs(n).toFixed(2)}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  if (d.toDateString() === today.toDateString()) return `HOY, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `AYER, ${time}`;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).toUpperCase() + `, ${time}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function WalletCard({ wallet, onReload }: { wallet: WalletType | undefined; type: string; label: string; onReload: () => void }) {
  const balance = wallet?.balance ?? 0;
  const low = balance < 50;

  return (
    <div className={`bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow flex flex-col gap-5 ${low ? 'border-amber-200' : 'border-[#e8f0f7]'}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[#8aa8cc] text-[10px] font-black uppercase tracking-widest">
            {wallet?.type === 'snack' ? 'Billetera Snack' : 'Billetera Comedor'}
          </p>
          {low && (
            <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-bold mt-1">
              <AlertTriangle className="h-3 w-3" /> Saldo Bajo
            </span>
          )}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${low ? 'bg-amber-50' : 'bg-[#e8f0f7]'}`}>
          <Wallet className={`h-5 w-5 ${low ? 'text-amber-500' : 'text-[#7CB9E8]'}`} />
        </div>
      </div>
      <p className={`text-5xl font-black tracking-tight ${low ? 'text-amber-600' : 'text-[#004B87]'}`}>
        {formatMoney(balance)}
      </p>
      <button
        onClick={onReload}
        className="w-full bg-[#F4C430] hover:bg-[#e6b110] active:scale-95 text-[#1a3a5c] font-black text-sm px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm uppercase"
      >
        <CreditCard className="h-4 w-4" /> Recargar Saldo
      </button>
    </div>
  );
}

function NutriPuntosCard({ consumer }: { consumer: Consumer }) {
  const pts = consumer.earned_nutri_points || 0;
  const levels = [
    { name: 'Bronce', min: 0, max: 500, color: '#CD7F32' },
    { name: 'Plata', min: 500, max: 1000, color: '#A8A9AD' },
    { name: 'Oro', min: 1000, max: 2000, color: '#FFD700' },
    { name: 'Diamante', min: 2000, max: 5000, color: '#7CB9E8' },
  ];
  const currentLevel = levels.findLast(l => pts >= l.min) || levels[0];
  const nextLevel = levels[levels.indexOf(currentLevel) + 1];
  const progress = nextLevel
    ? ((pts - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
    : 100;

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e8f0f7] shadow-sm">
      {/* Level Badge */}
      <div className="flex justify-between items-start mb-5">
        <span
          className="text-[10px] font-black px-3 py-1.5 rounded-full border-2 uppercase tracking-widest"
          style={{ color: currentLevel.color, borderColor: currentLevel.color + '55', backgroundColor: currentLevel.color + '15' }}
        >
          Nivel {currentLevel.name}
        </span>
        <Zap className="h-5 w-5 text-[#F4C430]" />
      </div>

      {/* Star + Title */}
      <div className="flex items-center gap-3 mb-3">
        <Star className="h-12 w-12 text-[#e8f0f7]" fill="#e8f0f7" />
        <h3 className="font-black text-[#004B87] text-lg leading-snug">
          Nutri-Puntos de<br />{consumer.first_name} {consumer.last_name}
        </h3>
      </div>

      {/* Points */}
      <p className="text-5xl font-black tracking-tighter" style={{ color: currentLevel.color }}>
        {pts.toLocaleString()} <span className="text-sm font-bold text-[#8aa8cc]">PTS</span>
      </p>

      {/* Progress bar */}
      {nextLevel && (
        <div className="mt-5">
          <div className="flex justify-between text-[10px] font-bold text-[#8aa8cc] uppercase tracking-widest mb-1.5">
            <span>Progreso hacia {nextLevel.name}</span>
            <span>{nextLevel.min} PTS</span>
          </div>
          <div className="w-full bg-[#f0f5fb] rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.max(2, progress)}%`, backgroundColor: currentLevel.color }}
            />
          </div>
        </div>
      )}

      {/* Next reward */}
      <div className="mt-5 bg-[#004B87] rounded-xl p-4 flex items-start gap-3">
        <Star className="h-5 w-5 text-[#F4C430] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[#F4C430] font-black text-[10px] tracking-widest uppercase">Siguiente Recompensa</p>
          <p className="text-white font-semibold text-sm mt-0.5">
            {nextLevel ? `¡Almuerzo gratis al llegar a ${nextLevel.min} pts!` : '¡Has alcanzado el nivel máximo! 🏆'}
          </p>
        </div>
      </div>
    </div>
  );
}


function AllergyCard({ consumer }: { consumer: Consumer }) {
  const [editing, setEditing] = useState(false);
  const [allergies, setAllergies] = useState<string[]>(consumer.allergies || []);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = input.trim().toUpperCase();
    if (!trimmed) return;
    if (allergies.includes(trimmed)) { setInput(''); return; }
    setAllergies(prev => [...prev, trimmed]);
    setInput('');
  };

  const handleRemove = (item: string) => {
    setAllergies(prev => prev.filter(a => a !== item));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const { updateAllergies } = await import('@/app/(portal)/parent/actions');
      await updateAllergies(consumer.id, allergies);
      setEditing(false);
    } catch (e: any) {
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setAllergies(consumer.allergies || []);
    setInput('');
    setEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e8f0f7] shadow-sm">
      <div className="flex items-center gap-3 mb-1">
        <div className="bg-[#e8f0f7] h-10 w-10 rounded-xl flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-[#7CB9E8]" />
        </div>
        <h3 className="font-black text-[#004B87] text-lg">Salud y Seguridad</h3>
      </div>
      <p className="text-[#8aa8cc] text-sm ml-[52px] mb-5">Restricciones para {consumer.first_name} {consumer.last_name}.</p>

      {/* Alergias */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-3">
          <p className="text-[#8aa8cc] font-black text-[10px] uppercase tracking-widest">Alergias Registradas</p>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-[#7CB9E8] text-xs font-black border border-[#7CB9E8] rounded-full px-3 py-1 hover:bg-[#e8f0f7] transition"
            >
              <Pencil className="h-3 w-3" />
              {allergies.length > 0 ? 'Editar' : 'Añadir'}
            </button>
          )}
        </div>

        {/* View mode */}
        {!editing && (
          allergies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {allergies.map(al => (
                <span key={al} className="bg-red-500 text-white font-black px-3 py-1.5 rounded-full text-xs shadow-sm uppercase">
                  {al}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[#b0c8e0] text-sm font-medium italic">Sin alergias reportadas.</p>
          )
        )}

        {/* Edit mode */}
        {editing && (
          <div className="space-y-3">
            {/* Current tags with X */}
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {allergies.map(al => (
                <span key={al} className="flex items-center gap-1.5 bg-red-500 text-white font-black px-3 py-1.5 rounded-full text-xs shadow-sm">
                  {al}
                  <button
                    onClick={() => handleRemove(al)}
                    className="hover:bg-red-700 rounded-full h-4 w-4 flex items-center justify-center transition"
                    title="Eliminar"
                  >
                    ×
                  </button>
                </span>
              ))}
              {allergies.length === 0 && (
                <p className="text-[#b0c8e0] text-xs italic">Escribe una alergia y presiona Añadir.</p>
              )}
            </div>

            {/* Input row */}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder="Ej: Gluten, Nueces..."
                className="flex-1 border border-[#e8f0f7] rounded-xl px-4 py-2.5 text-sm text-[#004B87] placeholder-[#b0c8e0] focus:outline-none focus:border-[#7CB9E8] bg-[#f8fafd]"
                autoFocus
              />
              <button
                onClick={handleAdd}
                disabled={!input.trim()}
                className="bg-[#e8f0f7] hover:bg-[#d0e4f5] text-[#7CB9E8] font-black px-4 py-2.5 rounded-xl text-sm transition disabled:opacity-40"
              >
                + Añadir
              </button>
            </div>

            {/* Error */}
            {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}

            {/* Save / Cancel */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#004B87] hover:bg-[#003870] text-white font-black text-sm py-2.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <><RefreshCcw className="h-3.5 w-3.5 animate-spin" /> Guardando...</> : 'Guardar cambios'}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-[#8aa8cc] hover:bg-[#f0f5fb] transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Productos Bloqueados */}
      <div>
        <p className="flex items-center gap-1.5 text-amber-500 font-black text-[10px] uppercase tracking-widest mb-3">
          <AlertTriangle className="h-3.5 w-3.5" /> Productos Bloqueados
        </p>
        <p className="text-[#b0c8e0] text-sm">No hay productos bloqueados.</p>
        <button className="text-[#7CB9E8] text-xs font-bold hover:underline mt-3 flex items-center gap-1">
          <Tag className="h-3.5 w-3.5" /> Configurar límites de gasto diario
        </button>
      </div>
    </div>
  );
}


function TransactionsFeed({ transactions, consumerId }: { transactions: Transaction[]; consumerId: string }) {
  const filtered = transactions.filter(t => t.consumer_id === consumerId).slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-[#e8f0f7] shadow-sm overflow-hidden">
      <div className="px-7 py-5 border-b border-[#f0f5fb] flex justify-between items-center">
        <div>
          <h3 className="font-black text-[#004B87] text-xl">Historial de Transacciones</h3>
          <p className="text-[#8aa8cc] text-sm mt-0.5">Últimos consumos realizados en la escuela.</p>
        </div>
        <button className="text-[#b0c8e0] hover:text-[#7CB9E8] hover:bg-[#e8f0f7] p-2.5 rounded-full transition active:rotate-180 duration-500">
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-[#f0f5fb]">
        {filtered.length === 0 ? (
          <div className="px-7 py-12 text-center">
            <History className="h-10 w-10 text-[#e8f0f7] mx-auto mb-3" />
            <p className="text-[#b0c8e0] font-medium text-sm">No hay transacciones registradas aún.</p>
          </div>
        ) : filtered.map(tx => {
          const isCredit = tx.amount > 0;
          return (
            <div key={tx.id} className="flex items-center justify-between px-7 py-5 hover:bg-[#f8fafd] transition cursor-pointer group">
              <div className="flex items-center gap-5">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform flex-shrink-0 ${isCredit ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {isCredit ? <CreditCard className="h-5 w-5 text-emerald-500" /> : <Utensils className="h-5 w-5 text-red-400" />}
                </div>
                <div>
                  <p className="font-black text-[#004B87] text-sm tracking-wide uppercase">
                    {tx.description || (isCredit ? 'Recarga' : 'Consumo')}
                  </p>
                  <p className="text-[#8aa8cc] text-xs font-semibold mt-0.5">
                    {formatDate(tx.created_at)}
                    {tx.wallet_type && <><span className="mx-1">•</span><span className="uppercase">{tx.wallet_type}</span></>}
                  </p>
                </div>
              </div>
              <span className={`font-black text-lg tracking-tight flex-shrink-0 ${isCredit ? 'text-emerald-500' : 'text-[#004B87]'}`}>
                {isCredit ? '+' : '-'}{formatMoney(tx.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────
export default function ParentDashboardClient({ consumers, transactions, userProfile, needsOnboarding, userEmail }: Props) {
  const [activeStudentId, setActiveStudentId] = useState<string>(consumers[0]?.id ?? '');
  const [reloadWalletId, setReloadWalletId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(needsOnboarding ?? false);
  const [editingName, setEditingName] = useState(userProfile?.full_name || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const activeConsumer = useMemo(
    () => consumers.find(c => c.id === activeStudentId) ?? consumers[0],
    [consumers, activeStudentId]
  );

  const comedorWallet = activeConsumer?.wallets?.find(w => w.type === 'comedor');
  const snackWallet = activeConsumer?.wallets?.find(w => w.type === 'snack');
  const lastName = userProfile?.full_name?.split(' ').slice(-1)[0] ?? 'Familia';

  const handleReload = (type: 'comedor' | 'snack') => {
    const wId = type === 'comedor' ? comedorWallet?.id : snackWallet?.id;
    if (wId) {
      setReloadWalletId(wId);
    }
  };

  const handleSaveProfile = async () => {
    if (!userProfile?.id || !editingName.trim()) return;
    setIsSavingProfile(true);
    try {
      const { updateParentProfile } = await import('@/app/(portal)/parent/actions');
      await updateParentProfile(userProfile.id, editingName.trim());
      setShowSettings(false);
    } catch (e: any) {
      alert("Error guardando el perfil: " + e.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Dialog open={!!reloadWalletId} onOpenChange={(open) => !open && setReloadWalletId(null)}>
        <DialogContent className="sm:max-w-md bg-transparent border-none shadow-none p-0">
          <DialogTitle className="sr-only">Recargar Billetera</DialogTitle>
          <DialogDescription className="sr-only">Formulario para recargar el saldo de la billetera escolar.</DialogDescription>
          {reloadWalletId && (
            <WalletReload walletId={reloadWalletId} schoolId={userProfile?.school_id ?? ''} />
          )}
        </DialogContent>
      </Dialog>

      {/* Profile Settings Modal */}
      <Dialog
        open={showSettings}
        onOpenChange={(open) => {
          // Block closing if this is the mandatory onboarding step
          if (needsOnboarding && !open) return;
          setShowSettings(open);
        }}
      >
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 border-none shadow-xl">
          <DialogTitle className="text-2xl font-black text-[#004B87]">
            {needsOnboarding ? '¡Bienvenido a NutriPass!' : 'Configuración de Perfil'}
          </DialogTitle>
          <DialogDescription className="text-sm text-[#8aa8cc] -mt-1">
            {needsOnboarding
              ? 'Para comenzar, dinos cómo llamarte. Este nombre aparecerá en tus recibos y notificaciones.'
              : 'Actualiza tu nombre completo para personalizar tu experiencia y los recibos.'}
          </DialogDescription>

          <div className="space-y-4 mt-2">
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Nombre Completo</label>
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                placeholder="Ej. Familia Pérez"
                className="w-full px-4 py-3 text-lg font-semibold text-slate-900 border-2 border-[#e8f0f7] rounded-xl focus:border-[#7CB9E8] focus:outline-none transition"
                autoFocus={needsOnboarding}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600 mb-1">Correo (Cuenta)</label>
              <input
                type="email"
                disabled
                value={userEmail || userProfile?.email || ''}
                className="w-full px-4 py-3 text-lg font-semibold text-slate-400 bg-slate-50 border-2 border-slate-100 rounded-xl cursor-not-allowed"
              />
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={isSavingProfile || !editingName.trim()}
            className="mt-4 w-full bg-[#004B87] text-white font-black py-3.5 rounded-xl hover:bg-[#003870] transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSavingProfile ? <><RefreshCcw className="h-4 w-4 animate-spin" /> Guardando...</> : needsOnboarding ? 'Comenzar →' : 'Guardar Cambios'}
          </button>
        </DialogContent>
      </Dialog>
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-6 border-b border-[#e8f0f7]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black text-[#004B87] tracking-tight">
              ¡Hola, Fam. {lastName}!
            </h1>
            <button 
              onClick={() => setShowSettings(true)}
              className="h-10 w-10 bg-[#f0f5fb] mt-2 rounded-full flex items-center justify-center text-[#7CB9E8] hover:bg-[#e8f0f7] hover:text-[#004B87] transition active:scale-95 shadow-sm"
              title="Configuración de Perfil"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
          <p className="text-[#7CB9E8] font-medium mt-1">Gestiona las billeteras y nutrición de tus hijos.</p>
        </div>

        {/* Student Selector Pills */}
        {consumers.length > 1 && (
          <div className="flex bg-white rounded-full p-1 shadow-sm border border-[#e8f0f7] flex-wrap gap-1">
            {consumers.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveStudentId(c.id)}
                className={`px-5 py-2 rounded-full font-bold text-sm transition-all duration-300 ${
                  activeStudentId === c.id
                    ? 'bg-[#7CB9E8] text-white shadow'
                    : 'text-[#8aa8cc] hover:text-[#004B87]'
                }`}
              >
                {c.first_name} {c.last_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main Grid ── */}
      {activeConsumer ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Wallets + Transactions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Wallets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <WalletCard
                wallet={comedorWallet}
                type="comedor"
                label="Billetera Comedor"
                onReload={() => handleReload('comedor')}
              />
              <WalletCard
                wallet={snackWallet}
                type="snack"
                label="Billetera Snack"
                onReload={() => handleReload('snack')}
              />
            </div>

            {/* Transactions */}
            <TransactionsFeed transactions={transactions} consumerId={activeConsumer.id} />
          </div>

          {/* Right: Nutri-Puntos + Salud */}
          <div className="space-y-5">
            <NutriPuntosCard consumer={activeConsumer} />
            <AllergyCard consumer={activeConsumer} />

            {/* How it works */}
            <div className="bg-[#f0f5fb] rounded-2xl p-6 border border-[#e8f0f7]">
              <h3 className="font-black text-[#004B87] text-lg mb-4">¿Cómo funciona?</h3>
              <div className="space-y-3">
                {[
                  'Recarga el saldo desde tu celular.',
                  'Tu hijo paga con su tag NFC en la escuela.',
                  'Recibes alertas de consumo en tiempo real.',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="font-black text-[#7CB9E8] text-sm min-w-[16px]">{i + 1}.</span>
                    <p className="text-[#4a6fa5] text-sm font-medium">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-16 text-center border border-[#e8f0f7] shadow-sm">
          <ShieldCheck className="h-16 w-16 text-[#e8f0f7] mx-auto mb-4" />
          <h2 className="text-xl font-black text-[#004B87]">Sin alumnos registrados</h2>
          <p className="text-[#8aa8cc] font-medium mt-2 max-w-sm mx-auto">
            Solicita al colegio que asocie la matrícula de tu hijo a tu cuenta de correo.
          </p>
        </div>
      )}
    </div>
  );
}
