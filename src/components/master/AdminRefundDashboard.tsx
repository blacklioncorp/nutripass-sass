'use client';

import { useState, useTransition } from 'react';
import { processRefund, RefundResult } from '@/app/(dashboard)/master/refunds/actions';
import { AlertTriangle, CheckCircle2, XCircle, DollarSign, User, School, Clock, Loader2, X, Info } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ConsumerRefundRow {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  status: 'cancellation_requested' | 'closed';
  cancellationRequestedAt: string | null;
  schoolName: string;
  parentFirstName: string;
  parentLastName: string;
  parentEmail: string;
  parentPhone: string;
  comedorBalance: number;
  snackBalance: number;
  comedorWalletStatus: string;
  snackWalletStatus: string;
  grossBalance: number;
  adminFee: number;
  refundAmount: number;
  hasOverdraft: boolean;
}

interface Props {
  consumers: ConsumerRefundRow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

const fmtDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConsumerRefundRow['status'] }) {
  if (status === 'closed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
        <CheckCircle2 className="h-3 w-3" /> Liquidada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
      <Clock className="h-3 w-3" /> Baja Solicitada
    </span>
  );
}

function OverdraftBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
      <AlertTriangle className="h-3 w-3" /> Adeudo sin Reembolso
    </span>
  );
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

interface ModalProps {
  consumer: ConsumerRefundRow;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  result: RefundResult | null;
  resultError: string | null;
}

function ConfirmModal({ consumer, onClose, onConfirm, isPending, result, resultError }: ModalProps) {
  const isSuccess = result?.success === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        onClick={!isPending && !isSuccess ? onClose : undefined}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className={`p-6 ${isSuccess ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSuccess
                ? <CheckCircle2 className="h-7 w-7" />
                : <AlertTriangle className="h-7 w-7" />}
              <div>
                <h2 className="text-xl font-black leading-tight">
                  {isSuccess ? '¡Cuenta Liquidada!' : 'Confirmar Liquidación'}
                </h2>
                <p className="text-white/70 text-xs font-semibold mt-0.5">
                  {isSuccess ? 'Operación completada exitosamente' : 'Esta acción NO se puede deshacer'}
                </p>
              </div>
            </div>
            {!isPending && !isSuccess && (
              <button onClick={onClose} className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Success state */}
          {isSuccess && result && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                <p className="text-emerald-800 font-bold text-sm text-center">
                  Los saldos de <span className="font-black">{result.consumer_name}</span> han sido llevados a $0.00 y sus billeteras están cerradas en Supabase.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded-xl p-3 border border-emerald-100 text-center">
                    <p className="text-slate-500 font-semibold">Saldo Bruto</p>
                    <p className="font-black text-slate-800">{fmt(result.gross_balance ?? 0)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-emerald-100 text-center">
                    <p className="text-slate-500 font-semibold">Comisión (5%)</p>
                    <p className="font-black text-red-600">-{fmt(result.admin_fee ?? 0)}</p>
                  </div>
                </div>
              </div>

              {result.had_overdraft ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-2" />
                  <p className="text-red-700 font-black text-sm">Adeudo sin Reembolso</p>
                  <p className="text-red-500 text-xs font-medium mt-1">La cuenta tenía un saldo negativo. No procede reembolso.</p>
                </div>
              ) : (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-5 text-center">
                  <DollarSign className="h-7 w-7 text-blue-600 mx-auto mb-1" />
                  <p className="text-slate-600 text-xs font-bold uppercase tracking-widest mb-1">Monto a Reembolsar en Stripe</p>
                  <p className="text-4xl font-black text-blue-700">{fmt(result.refund_amount ?? 0)}</p>
                  <p className="text-blue-500 text-xs font-semibold mt-2">
                    ⚠️ Procede al Dashboard de Stripe y emite un reembolso manual por esta cantidad.
                  </p>
                </div>
              )}

              <button onClick={onClose} className="w-full bg-slate-900 hover:bg-slate-700 text-white font-black py-4 rounded-xl transition">
                Entendido — Cerrar
              </button>
            </div>
          )}

          {/* Error state */}
          {resultError && !isSuccess && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 font-bold text-sm">Error al procesar</p>
                <p className="text-red-500 text-xs mt-1">{resultError}</p>
              </div>
            </div>
          )}

          {/* Confirmation state (not yet submitted) */}
          {!isSuccess && (
            <>
              {/* Student info */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Cuenta a Liquidar</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Alumno</span>
                  <span className="font-bold text-slate-900">{consumer.firstName} {consumer.lastName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Padre/Tutor</span>
                  <span className="font-bold text-slate-900">{consumer.parentFirstName} {consumer.parentLastName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Escuela</span>
                  <span className="font-bold text-slate-900">{consumer.schoolName}</span>
                </div>
              </div>

              {/* Financial summary */}
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                  <span className="text-slate-500">Billetera Comedor</span>
                  <span className="font-bold text-emerald-700">{fmt(consumer.comedorBalance)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                  <span className="text-slate-500">Billetera Snacks</span>
                  <span className="font-bold text-violet-700">{fmt(consumer.snackBalance)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100 text-sm">
                  <span className="text-slate-500">Comisión Administrativa (5%)</span>
                  <span className="font-bold text-red-600">-{fmt(consumer.adminFee)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-black text-slate-900">Monto Neto a Reembolsar</span>
                  {consumer.hasOverdraft
                    ? <span className="font-black text-red-600">$0.00 (Adeudo)</span>
                    : <span className="font-black text-blue-700 text-lg">{fmt(consumer.refundAmount)}</span>
                  }
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-amber-700 text-xs font-semibold leading-relaxed">
                  Esta acción <strong>pondrá ambas billeteras en $0.00</strong>, cambiará el estatus de la cuenta a <strong>"Cerrada"</strong> e impedirá futuras compras o recargas. <strong>No se puede deshacer.</strong>
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  disabled={isPending}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-xl transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3.5 rounded-xl transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
                >
                  {isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
                    : 'Aprobar y Liquidar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminRefundDashboard({ consumers }: Props) {
  const [selectedConsumer, setSelectedConsumer] = useState<ConsumerRefundRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RefundResult | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'cancellation_requested' | 'closed'>('cancellation_requested');

  const pending = consumers.filter(c => c.status === 'cancellation_requested');
  const closed  = consumers.filter(c => c.status === 'closed');
  const visible = filter === 'all' ? consumers : consumers.filter(c => c.status === filter);

  const openModal = (consumer: ConsumerRefundRow) => {
    setSelectedConsumer(consumer);
    setResult(null);
    setResultError(null);
  };

  const closeModal = () => {
    setSelectedConsumer(null);
    setResult(null);
    setResultError(null);
  };

  const handleConfirm = () => {
    if (!selectedConsumer) return;
    startTransition(async () => {
      const res = await processRefund(selectedConsumer.id);
      if (res.success) {
        setResult(res);
      } else {
        setResultError(res.error ?? 'Error desconocido.');
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#0d1f3c] tracking-tight">
            Reembolsos & Bajas Escolares
          </h1>
          <p className="text-slate-500 font-medium mt-1 text-sm">
            Gestiona las solicitudes de baja y liquida cuentas de forma atómica.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold">
          <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
            {closed.length} liquidada{closed.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Solicitudes Activas</p>
          <p className="text-4xl font-black text-amber-600">{pending.length}</p>
          <p className="text-xs text-slate-400 mt-1 font-medium">cuentas por liquidar</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Total a Reembolsar</p>
          <p className="text-4xl font-black text-blue-700">
            {fmt(pending.filter(c => !c.hasOverdraft).reduce((acc, c) => acc + c.refundAmount, 0))}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-medium">monto neto pendiente</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Cuentas con Adeudo</p>
          <p className="text-4xl font-black text-red-600">
            {pending.filter(c => c.hasOverdraft).length}
          </p>
          <p className="text-xs text-slate-400 mt-1 font-medium">reembolso $0.00</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {(['cancellation_requested', 'all', 'closed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === f
                ? 'bg-white text-[#0d1f3c] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f === 'cancellation_requested' ? '⏳ Pendientes' : f === 'all' ? '📋 Todos' : '✅ Liquidadas'}
          </button>
        ))}
      </div>

      {/* Data Table */}
      {visible.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-16 text-center">
          <span className="text-5xl mb-4 block">🎉</span>
          <h3 className="text-xl font-black text-slate-800 mb-2">Sin solicitudes pendientes</h3>
          <p className="text-slate-400 font-medium">No hay cuentas en este estado en este momento.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Alumno / ID</th>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Padre / Escuela</th>
                  <th className="text-right px-6 py-4 text-xs font-black uppercase tracking-widest text-emerald-600">Comedor</th>
                  <th className="text-right px-6 py-4 text-xs font-black uppercase tracking-widest text-violet-600">Snacks</th>
                  <th className="text-right px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Comisión 5%</th>
                  <th className="text-right px-6 py-4 text-xs font-black uppercase tracking-widest text-blue-600">Monto Neto</th>
                  <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400">Estado</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visible.map(consumer => (
                  <tr
                    key={consumer.id}
                    className={`transition-colors group ${
                      consumer.status === 'closed' ? 'opacity-60 bg-slate-50/50' : 'hover:bg-blue-50/30'
                    }`}
                  >
                    {/* Alumno */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm">
                          {consumer.firstName[0]}{consumer.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {consumer.firstName} {consumer.lastName}
                          </p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {consumer.studentId || consumer.id.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Padre / Escuela */}
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="font-semibold text-slate-700 leading-tight">
                            {consumer.parentFirstName} {consumer.parentLastName}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <School className="h-3 w-3 text-slate-300" />
                            <p className="text-xs text-slate-400 font-medium">{consumer.schoolName}</p>
                          </div>
                          {consumer.cancellationRequestedAt && (
                            <p className="text-xs text-amber-500 font-semibold mt-0.5">
                              Solicitó: {fmtDate(consumer.cancellationRequestedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Comedor */}
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold tabular-nums ${consumer.comedorBalance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {fmt(consumer.comedorBalance)}
                      </span>
                    </td>

                    {/* Snacks */}
                    <td className="px-6 py-4 text-right">
                      <span className={`font-bold tabular-nums ${consumer.snackBalance < 0 ? 'text-red-600' : 'text-violet-700'}`}>
                        {fmt(consumer.snackBalance)}
                      </span>
                    </td>

                    {/* Comisión */}
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-red-500 tabular-nums text-xs">
                        -{fmt(consumer.adminFee)}
                      </span>
                    </td>

                    {/* Monto Neto */}
                    <td className="px-6 py-4 text-right">
                      {consumer.hasOverdraft ? (
                        <OverdraftBadge />
                      ) : (
                        <span className="font-black text-blue-700 tabular-nums text-base">
                          {fmt(consumer.refundAmount)}
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                      <StatusBadge status={consumer.status} />
                    </td>

                    {/* Acción */}
                    <td className="px-6 py-4 text-right">
                      {consumer.status === 'cancellation_requested' ? (
                        <button
                          onClick={() => openModal(consumer)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-lg shadow-sm shadow-red-600/30 transition-all active:scale-95 whitespace-nowrap"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          Aprobar y Liquidar
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300 font-semibold italic">Liquidada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedConsumer && (
        <ConfirmModal
          consumer={selectedConsumer}
          onClose={closeModal}
          onConfirm={handleConfirm}
          isPending={isPending}
          result={result}
          resultError={resultError}
        />
      )}
    </div>
  );
}
