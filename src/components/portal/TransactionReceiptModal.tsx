'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Receipt, FileText, Send, CheckCircle2 } from 'lucide-react';
import { submitInvoiceRequest } from '@/app/(portal)/parent/actions';

type Transaction = {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
};

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
};

export default function TransactionReceiptModal({ isOpen, onOpenChange, transaction }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transaction) return null;

  const isReload = transaction.transaction_type === 'credit' || transaction.description.toLowerCase().includes('recarga');
  const baseAmount = Math.abs(transaction.amount);
  const fee = isReload ? baseAmount * 0.12 : 0; // Simulated 12% fee for reloads
  const total = baseAmount + fee;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      transaction_id: transaction.id,
      rfc: formData.get('rfc') as string,
      razon_social: formData.get('razon_social') as string,
      codigo_postal: formData.get('codigo_postal') as string,
      regimen_fiscal: formData.get('regimen_fiscal') as string,
      uso_cfdi: formData.get('uso_cfdi') as string,
    };

    try {
      await submitInvoiceRequest(data);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
            setTimeout(() => {
                setShowForm(false);
                setSuccess(false);
                setError(null);
            }, 300);
        }
    }}>
      <DialogContent className="sm:max-w-[400px] bg-white rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-[#004B87] p-8 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-white/10" style={{ clipPath: 'polygon(0 0, 5% 100%, 10% 0, 15% 100%, 20% 0, 25% 100%, 30% 0, 35% 100%, 40% 0, 45% 100%, 50% 0, 55% 100%, 60% 0, 65% 100%, 70% 0, 75% 100%, 80% 0, 85% 100%, 90% 0, 95% 100%, 100% 0)' }}></div>
          <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-black tracking-tight">Recibo Digital</h2>
          <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">NutriPass • Transparencia</p>
        </div>

        <div className="p-8 space-y-6">
          {!showForm ? (
            <>
              {/* Receipt Content */}
              <div className="space-y-4 font-medium text-sm text-[#1a3a5c]">
                <div className="flex justify-between border-b border-dashed border-[#e8f0f7] pb-2">
                  <span className="text-[#8aa8cc]">ID Transacción</span>
                  <span className="font-mono text-[10px]">{transaction.id.slice(0, 8)}...</span>
                </div>
                <div className="flex justify-between border-b border-dashed border-[#e8f0f7] pb-2">
                  <span className="text-[#8aa8cc]">Fecha</span>
                  <span>{new Date(transaction.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-[#8aa8cc]">Concepto</span>
                  <span className="text-right max-w-[180px] leading-tight font-black">{transaction.description}</span>
                </div>
                
                <div className="mt-6 pt-4 border-t-2 border-[#f0f5fb] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8aa8cc]">Monto Base</span>
                    <span>${baseAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8aa8cc]">Tarifa de Servicio (NutriPass)</span>
                    <span>${fee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-xl font-black mt-4 pt-4 border-t border-[#e8f0f7]">
                    <span>Total Pagado</span>
                    <span className="text-[#004B87]">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {isReload && (
                <button 
                  onClick={() => setShowForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-[#f0f5fb] text-[#004B87] font-black rounded-2xl hover:bg-[#e8f0f7] transition text-sm"
                >
                  <FileText className="h-4 w-4" /> Solicitar Factura Fiscal
                </button>
              )}
            </>
          ) : success ? (
            <div className="py-10 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-500" />
              <h3 className="text-xl font-black text-[#1a3a5c]">Solicitud Enviada</h3>
              <p className="text-[#8aa8cc] text-sm font-medium">
                Tu solicitud de factura ha sido registrada. La recibirás en tu correo en un plazo de 48-72 horas hábiles.
              </p>
              <button 
                onClick={() => onOpenChange(false)}
                className="w-full py-4 bg-[#1a3a5c] text-white font-black rounded-2xl mt-6 transition"
              >
                Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-black text-[#1a3a5c] mb-2">Datos Fiscales</h3>
              
              <div className="grid grid-cols-1 gap-3 text-sm">
                <input required name="rfc" placeholder="RFC" className="w-full px-4 py-3 rounded-xl border border-[#e8f0f7] bg-[#fcfdfe] focus:ring-2 focus:ring-[#004B87] outline-none font-bold" />
                <input required name="razon_social" placeholder="Razón Social" className="w-full px-4 py-3 rounded-xl border border-[#e8f0f7] bg-[#fcfdfe] focus:ring-2 focus:ring-[#004B87] outline-none font-bold" />
                <input required name="codigo_postal" placeholder="Código Postal" className="w-full px-4 py-3 rounded-xl border border-[#e8f0f7] bg-[#fcfdfe] focus:ring-2 focus:ring-[#004B87] outline-none font-bold" />
                <select required name="regimen_fiscal" className="w-full px-4 py-3 rounded-xl border border-[#e8f0f7] bg-[#fcfdfe] focus:ring-2 focus:ring-[#004B87] outline-none font-bold">
                  <option value="">Régimen Fiscal</option>
                  <option value="601">General de Ley Personas Morales</option>
                  <option value="603">Personas Morales con Fines no Lucrativos</option>
                  <option value="605">Sueldos e Ingresos Asimilados a Salarios</option>
                  <option value="606">Arrendamiento</option>
                  <option value="612">Personas Físicas con Actividades Empresariales</option>
                  <option value="626">Régimen Simplificado de Confianza (RESICO)</option>
                </select>
                <select required name="uso_cfdi" className="w-full px-4 py-3 rounded-xl border border-[#e8f0f7] bg-[#fcfdfe] focus:ring-2 focus:ring-[#004B87] outline-none font-bold">
                  <option value="">Uso de CFDI</option>
                  <option value="G03">Gastos en general</option>
                  <option value="D01">Honorarios médicos, dentales y gastos hospitalarios</option>
                  <option value="D10">Pagos por servicios educativos (colegiaturas)</option>
                  <option value="S01">Sin efectos fiscales</option>
                </select>
              </div>

              {error && <p className="text-red-500 text-xs font-bold text-center mt-2">{error}</p>}

              <div className="flex gap-2 mt-6">
                <button 
                  type="button"
                  disabled={loading}
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-4 bg-[#f0f5fb] text-[#1a3a5c] font-black rounded-2xl hover:bg-[#e8f0f7] transition text-sm"
                >
                  Regresar
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-[#004B87] text-white font-black rounded-2xl hover:bg-[#003870] transition shadow-md text-sm flex items-center justify-center gap-2"
                >
                  {loading ? 'Enviando...' : <><Send className="h-4 w-4" /> Enviar</>}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="bg-[#fcfdfe] px-8 py-4 border-t border-[#e8f0f7] text-center">
          <p className="text-[10px] text-[#8aa8cc] font-black uppercase tracking-widest">NutriPass © 2026 • Ticket ID: {transaction.id.slice(-6)}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
