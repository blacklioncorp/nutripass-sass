'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet, Zap, ShieldCheck, History, ChevronDown,
  RefreshCcw, AlertTriangle, Pencil, Star, TrendingUp, CreditCard,
  Utensils, Tag, Receipt, LogOut
} from 'lucide-react';
import type { Consumer, Transaction, Wallet as WalletType, UserProfile } from '@/app/(portal)/parent/page';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import WalletReload from './WalletReload';
import TransactionReceiptModal from './TransactionReceiptModal';
import BulkReloadModal from './BulkReloadModal';
import ParentProfileModal from './ParentProfileModal';

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
  const absoluteAmount = Math.abs(n).toFixed(2);
  return n < 0 ? `-$${absoluteAmount}` : `$${absoluteAmount}`;
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

function WalletCard({ wallet, type, onReload }: { wallet: WalletType | undefined; type: string; label: string; onReload: () => void }) {
  const balance = wallet?.balance ?? 0;
  const isNegative = balance < 0;
  const isLow = balance < 50 && !isNegative;
  
  // Use the explicit `type` prop so the label is always correct even if wallet.type is null
  const walletType = wallet?.type ?? type;

  return (
    <div className={`bg-white rounded-2xl p-6 border shadow-sm hover:shadow-md transition-shadow flex flex-col gap-5 ${isNegative ? 'border-red-200 bg-red-50/10' : isLow ? 'border-amber-200' : 'border-[#e8f0f7]'}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[#8aa8cc] text-[10px] font-black uppercase tracking-widest">
            {type === 'snack' ? 'Billetera Snack' : 'Billetera Comedor'}
          </p>
          {isNegative ? (
            <span className="inline-flex items-center gap-1 text-red-600 text-[10px] font-bold mt-1 uppercase">
              <AlertTriangle className="h-3 w-3" /> Sobregirado (Deuda)
            </span>
          ) : isLow ? (
            <span className="inline-flex items-center gap-1 text-amber-600 text-[10px] font-bold mt-1">
              <AlertTriangle className="h-3 w-3" /> Saldo Bajo
            </span>
          ) : null}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isNegative ? 'bg-red-100 text-red-600' : isLow ? 'bg-amber-50' : 'bg-[#e8f0f7]'}`}>
          <Wallet className={`h-5 w-5 ${isNegative ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-[#7CB9E8]'}`} />
        </div>
      </div>
      <p className={`text-5xl font-black tracking-tight ${isNegative ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-[#004B87]'}`}>
        {formatMoney(balance)}
      </p>
      <button
        onClick={onReload}
        className={`w-full font-black text-sm px-4 py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm uppercase active:scale-95 ${isNegative ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-[#F4C430] hover:bg-[#e6b110] text-[#1a3a5c]'}`}
      >
        <CreditCard className="h-4 w-4" /> {isNegative ? 'Liquidar Deuda' : 'Recargar Saldo'}
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


function ExpenditureLimitCard({ consumer }: { consumer: Consumer }) {
  // --- SEGURIDAD DE RENDERIZADO ---
  // Si la columna daily_limit no existe en la base de datos o el objeto es nulo, 
  // devolvemos null para evitar que el dashboard entero se caiga en producción.
  if (!consumer || !('daily_limit' in consumer)) return null;

  const initialLimit = (consumer as any).daily_limit || 0;
  const [isActive, setIsActive] = useState(initialLimit > 0);
  const [limit, setLimit] = useState<string>(initialLimit > 0 ? String(initialLimit) : '');
  const [saving, setSaving] = useState(false);

  const handleToggle = async () => {
    const nextActive = !isActive;
    setIsActive(nextActive);
    
    // Si se apaga, el límite es 0. Si se enciende, default a 100 o el valor previo.
    const numericLimit = nextActive ? (parseFloat(limit) || 100) : 0;
    if (nextActive && !limit) setLimit('100');
    if (!nextActive) setLimit('');

    setSaving(true);
    try {
      const { updateDailyLimit } = await import('@/app/(portal)/parent/actions');
      await updateDailyLimit(consumer.id, numericLimit);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLimitChange = (val: string) => {
    // Regex para permitir solo números y un punto decimal
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setLimit(val);
    }
  };

  const handleSaveLimit = async () => {
    const numericValue = limit === '' ? null : parseFloat(limit);
    
    setSaving(true);
    try {
      const { updateDailyLimit } = await import('@/app/(portal)/parent/actions');
      await updateDailyLimit(consumer.id, numericValue as any);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-[#e8f0f7] shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 h-10 w-10 rounded-xl flex items-center justify-center">
            <Tag className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-black text-[#004B87] text-lg">Límite de Gasto</h3>
            <p className="text-[#8aa8cc] text-[10px] font-bold uppercase tracking-widest">Control diario de consumo</p>
          </div>
        </div>
        <button 
          onClick={handleToggle}
          disabled={saving}
          className={`w-12 h-6 rounded-full transition-all relative ${isActive ? 'bg-emerald-500' : 'bg-slate-200'}`}
        >
          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isActive ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      {isActive ? (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8aa8cc] font-black text-sm">$</span>
            <input 
              type="text" 
              inputMode="decimal"
              value={limit}
              onChange={(e) => handleLimitChange(e.target.value)}
              onBlur={handleSaveLimit}
              className="w-full pl-8 pr-4 py-3 bg-[#f8fafd] border border-[#e8f0f7] rounded-xl text-[#004B87] font-bold focus:ring-2 focus:ring-[#7CB9E8]/20 focus:border-[#7CB9E8] transition-all"
              placeholder="100.00"
            />
          </div>
          <p className="text-[10px] text-[#8aa8cc] font-medium leading-tight">
            Se impedirá cualquier compra en el POS si el acumulado del día excede este monto.
          </p>
        </div>
      ) : (
        <p className="text-[#b0c8e0] text-sm italic py-2">
          Sin límite de gasto configurado.
        </p>
      )}
      
      {saving && (
        <div className="mt-3 flex items-center gap-2 text-[#7CB9E8] text-[10px] font-bold uppercase tracking-widest animate-pulse">
          <RefreshCcw className="h-3 w-3 animate-spin" /> Guardando...
        </div>
      )}
    </div>
  );
}

function AllergyCard({ consumer }: { consumer: Consumer }) {
  const [editing, setEditing] = useState(false);
  const [allergies, setAllergies] = useState<string[]>(consumer.allergies || []);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

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
    if (!disclaimerAccepted) {
      setError('Debes aceptar el descargo de responsabilidad médico para poder registrar a tu hijo.');
      return;
    }
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
    setDisclaimerAccepted(false);
    setError('');
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
      <div className="mb-2">
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

            {/* Disclaimer */}
            <div className="flex items-start gap-3 mt-4 mb-2 bg-[#f8fafd] p-4 rounded-xl border border-[#e8f0f7]">
              <input 
                type="checkbox" 
                id={`disclaimer-${consumer.id}`}
                checked={disclaimerAccepted}
                onChange={(e) => {
                  setDisclaimerAccepted(e.target.checked);
                  if (e.target.checked && error === 'Debes aceptar el descargo de responsabilidad médico para poder registrar a tu hijo.') {
                    setError('');
                  }
                }}
                className="mt-1 flex-shrink-0 w-4 h-4 text-[#004B87] rounded focus:ring-[#7CB9E8] border-gray-300" 
                required
              />
              <label htmlFor={`disclaimer-${consumer.id}`} className="text-sm text-gray-600 font-medium leading-snug">
                Entiendo y acepto que SafeLunch es exclusivamente una plataforma tecnológica de intermediación. Libero a SafeLunch de cualquier responsabilidad médica, reacción alérgica o incidencia derivada de la preparación, manejo y consumo de los alimentos por parte de la cafetería escolar.
              </label>
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
    </div>
  );
}


function TransactionsFeed({ 
  transactions, 
  consumerId,
  onSelectTransaction
}: { 
  transactions: Transaction[]; 
  consumerId: string;
  onSelectTransaction: (tx: Transaction) => void;
}) {
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
            <div 
              key={tx.id} 
              onClick={() => onSelectTransaction(tx)}
              className="flex items-center justify-between px-7 py-5 hover:bg-[#f8fafd] transition cursor-pointer group"
            >
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
              <div className="flex items-center gap-3">
                <span className={`font-black text-lg tracking-tight flex-shrink-0 ${isCredit ? 'text-emerald-500' : 'text-[#004B87]'}`}>
                  {isCredit ? '+' : '-'}{formatMoney(tx.amount)}
                </span>
                <Receipt className="h-4 w-4 text-[#8aa8cc] group-hover:text-[#004B87] transition-colors" />
              </div>
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
  const [isBulkReloadOpen, setIsBulkReloadOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [showSettings, setShowSettings] = useState(needsOnboarding ?? false);
  const router = useRouter();

  const activeConsumer = useMemo(
    () => consumers.find(c => c.id === activeStudentId) ?? consumers[0],
    [consumers, activeStudentId]
  );

  const comedorWallet = activeConsumer?.wallets?.find(w => w.type === 'comedor');
  const snackWallet = activeConsumer?.wallets?.find(w => w.type === 'snack');
  const lastName = userProfile?.full_name?.split(' ').slice(-1)[0] ?? 'Familia';

  const handleReload = (type: 'comedor' | 'snack') => {
    const wallet = type === 'comedor' ? comedorWallet : snackWallet;
    if (wallet?.id) {
      setReloadWalletId(wallet.id);
    } else {
      alert(`La billetera de ${type === 'snack' ? 'Snack' : 'Comedor'} no está configurada para este alumno. Contacta a la escuela.`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Dialog open={!!reloadWalletId} onOpenChange={(open) => !open && setReloadWalletId(null)}>
        <DialogContent className="sm:max-w-md bg-transparent border-none shadow-none p-0 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Recargar Billetera</DialogTitle>
            <DialogDescription>Formulario para recargar el saldo de la billetera escolar.</DialogDescription>
          </DialogHeader>
          {reloadWalletId && (
            <WalletReload 
              walletId={reloadWalletId} 
              schoolId={userProfile?.school_id ?? ''} 
              onSuccess={() => setReloadWalletId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* BULK RELOAD DIALOG */}
      <Dialog open={isBulkReloadOpen} onOpenChange={setIsBulkReloadOpen}>
        <DialogContent className="max-w-2xl bg-transparent border-none shadow-none p-0 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Recarga Múltiple</DialogTitle>
            <DialogDescription>Recarga saldo para todos tus hijos en una sola transacción.</DialogDescription>
          </DialogHeader>
          <BulkReloadModal 
            consumers={consumers} 
            userProfile={userProfile} 
            onSuccess={() => setIsBulkReloadOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      <TransactionReceiptModal 
        isOpen={!!selectedTx} 
        onOpenChange={(o) => !o && setSelectedTx(null)} 
        transaction={selectedTx} 
      />

      <ParentProfileModal
        isOpen={showSettings}
        onOpenChange={setShowSettings}
        userProfile={userProfile}
        userEmail={userEmail}
        needsOnboarding={needsOnboarding}
      />
      
      {/* ── Header ── */}
      <div className="flex flex-col gap-6 pb-6 border-b border-[#e8f0f7]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[32px] border border-[#e8f0f7] shadow-sm w-full">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#004B87] tracking-tighter flex items-center flex-wrap gap-3">
              ¡Hola, Fam. {lastName}! 👋
              <button 
                onClick={() => setShowSettings(true)}
                className="h-11 w-11 bg-[#f0f5fb] rounded-full flex items-center justify-center text-[#7CB9E8] hover:bg-[#e8f0f7] hover:text-[#004B87] transition active:scale-95 shadow-sm"
                title="Configuración de Perfil"
              >
                <Pencil className="h-5 w-5" />
              </button>
            </h1>
            <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-[9px] sm:text-[10px]">Gestiona las billeteras y nutrición de tus hijos</p>
            <button
              onClick={() => window.location.href = '/auth/logout'}
              className="mt-4 flex items-center gap-2 text-red-400 hover:text-red-600 font-black text-[10px] uppercase tracking-widest transition-colors"
            >
              <LogOut className="h-3 w-3" /> Cerrar Sesión
            </button>
          </div>

          <button 
            onClick={() => setIsBulkReloadOpen(true)}
            className="w-full md:w-auto group bg-[#004B87] hover:bg-[#003a6b] text-white px-8 py-5 rounded-2xl flex items-center justify-center md:justify-start gap-4 transition shadow-xl shadow-blue-100 active:scale-95 min-h-[64px]"
          >
            <div className="h-9 w-9 bg-blue-400/30 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform shrink-0">
              <RefreshCcw className="h-5 w-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest leading-none mb-1.5">nuevo</p>
              <p className="font-black text-sm sm:text-base">Recarga Múltiple</p>
            </div>
          </button>
        </div>

        {/* Student Selector Pills */}
        {consumers.length > 1 && (
          <div className="flex bg-white rounded-3xl md:rounded-full p-1.5 shadow-sm border border-[#e8f0f7] flex-wrap gap-2 w-full md:w-fit">
            {consumers.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveStudentId(c.id)}
                className={`flex-1 md:flex-none px-6 py-3 rounded-2xl md:rounded-full font-black text-xs sm:text-sm transition-all duration-300 min-h-[44px] ${
                  activeStudentId === c.id
                    ? 'bg-[#7CB9E8] text-white shadow-md scale-[1.02]'
                    : 'text-[#8aa8cc] hover:text-[#004B87] hover:bg-slate-50'
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
            <TransactionsFeed 
              transactions={transactions} 
              consumerId={activeConsumer.id} 
              onSelectTransaction={setSelectedTx}
            />
          </div>

          {/* Right: Nutri-Puntos + Salud + Límite */}
          <div className="space-y-5">
            <NutriPuntosCard consumer={activeConsumer} />
            <ExpenditureLimitCard key={`limit-${activeConsumer.id}`} consumer={activeConsumer} />
            <AllergyCard key={`allergy-${activeConsumer.id}`} consumer={activeConsumer} />

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
