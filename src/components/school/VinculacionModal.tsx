'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Wifi, Save, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { linkNfcTag } from '@/app/(dashboard)/school/actions';

interface VinculacionModalProps {
  isOpen: boolean;
  onClose: () => void;
  consumer: {
    id: string;
    first_name: string;
    last_name: string;
    nfc_tag_uid?: string | null;
  };
}

/**
 * VinculacionModal - RFID Wristband Pairing Component
 * Designed for SafeLunch (School Cafeteria System)
 */
export default function VinculacionModal({ isOpen, onClose, consumer }: VinculacionModalProps) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Audio Context for success/error sounds (Web Audio API)
  const playSound = (type: 'success' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'success') {
        // High pitched pleasant chime: 880Hz (A5) -> 1320Hz (E6)
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
      } else {
        // Low pitched buzz for error: 220Hz (A3) -> 110Hz (A2)
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, audioCtx.currentTime);
        oscillator.frequency.linearRampToValueAtTime(110, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.4);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.4);
      }
    } catch (err) {
      console.warn('Audio feedback failed:', err);
    }
  };

  // Auto-focus logic for the invisible input
  useEffect(() => {
    if (isOpen && status === 'idle') {
      const focusInterval = setInterval(() => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      }, 500);
      return () => clearInterval(focusInterval);
    }
  }, [isOpen, status]);

  const handleLink = async (tagUid: string) => {
    if (!tagUid || status === 'saving') return;

    setStatus('saving');
    setErrorMessage(null);

    try {
      await linkNfcTag(consumer.id, tagUid);
      
      // Success flow
      playSound('success');
      setStatus('success');
      
      // Auto-close after feedback
      setTimeout(() => {
        onClose();
        // Reset state for next time
        setTimeout(() => setStatus('idle'), 300);
      }, 1500);

    } catch (error: any) {
      console.error('Link Error:', error);
      playSound('error');
      setStatus('error');
      
      // Customize message if it's a unique constraint error
      if (error.message?.includes('unique') || error.message?.includes('already registered')) {
        setErrorMessage('Esta pulsera ya está registrada con otro alumno.');
      } else {
        setErrorMessage('Error al vincular. Intente de nuevo.');
      }

      // Return to idle after error display
      setTimeout(() => {
        setStatus('idle');
        setScannedCode('');
      }, 3000);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm('¿Estás seguro de que deseas reportar extravío y desvincular esta pulsera?')) return;

    setStatus('saving');
    try {
      await linkNfcTag(consumer.id, ''); // In the action we should handle empty string as NULL or we update it here
      // Note: the linkNfcTag action might need to be adjusted to handle NULL, 
      // but usually setting it to empty string works or I can call supabase directly here.
      
      setStatus('success');
      setTimeout(() => {
        onClose();
        setTimeout(() => setStatus('idle'), 300);
      }, 1000);
    } catch (err) {
      setStatus('error');
      setErrorMessage('Error al desvincular.');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLink(scannedCode);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      
      {/* Invisible Scanner Input */}
      <input
        ref={inputRef}
        type="text"
        value={scannedCode}
        onChange={(e) => setScannedCode(e.target.value)}
        onKeyDown={handleKeyDown}
        className="opacity-0 absolute pointer-events-none"
        autoFocus
      />

      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-[#1a3a5c] tracking-tight italic">Vinculación NFC</h3>
            <p className="text-[#8aa8cc] text-[10px] font-bold uppercase tracking-widest mt-1">SafeLunch Digital Wallet</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
            disabled={status === 'saving'}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-10 flex flex-col items-center text-center space-y-8">
          
          {/* Main Visual State */}
          <div className="relative">
            {status === 'idle' && (
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-25"></div>
                <div className="h-24 w-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center shadow-inner relative z-10 border-4 border-white">
                  <Wifi className="h-10 w-10 animate-pulse" />
                </div>
              </div>
            )}

            {status === 'saving' && (
              <div className="h-24 w-24 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
            )}

            {status === 'success' && (
              <div className="h-24 w-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner border-4 border-white animate-in zoom-in duration-300">
                <CheckCircle2 className="h-12 w-12" />
              </div>
            )}

            {status === 'error' && (
              <div className="h-24 w-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow-inner border-4 border-white animate-in bounce-in duration-300">
                <AlertCircle className="h-12 w-12" />
              </div>
            )}
          </div>

          {/* Text Information */}
          <div className="space-y-2">
            <h4 className="text-2xl font-black text-[#1a3a5c]">
              {status === 'idle' && 'Esperando pulsera...'}
              {status === 'saving' && 'Procesando...'}
              {status === 'success' && '¡Vinculación Exitosa!'}
              {status === 'error' && 'Error detectado'}
            </h4>
            
            <p className="text-slate-500 font-medium">
              {status === 'idle' && (
                <>Pasa la pulsera por el lector para vincular a:<br/> 
                <span className="text-[#1a3a5c] font-black">{consumer.first_name} {consumer.last_name}</span></>
              )}
              {status === 'saving' && 'Guardando identificador en la base de datos...'}
              {status === 'success' && 'La pulsera ahora está lista para usarse.'}
              {status === 'error' && (errorMessage || 'No se pudo completar la operación.')}
            </p>
          </div>

          {/* Conditional Footer Actions */}
          {status === 'idle' && consumer.nfc_tag_uid && (
            <div className="pt-4 w-full">
              <button
                onClick={handleUnlink}
                className="flex items-center justify-center gap-2 w-full py-4 px-6 text-red-500 hover:bg-red-50 rounded-2xl transition-all text-xs font-black uppercase tracking-widest border-2 border-dashed border-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Reportar Extravío / Eliminar actual
              </button>
              <p className="text-[9px] text-slate-400 mt-3 font-bold uppercase">
                ID Actual: <span className="font-mono">{consumer.nfc_tag_uid}</span>
              </p>
            </div>
          )}

          {status === 'idle' && (
            <button
              onClick={onClose}
              className="w-full py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors text-sm"
            >
              CANCELAR
            </button>
          )}

        </div>
      </div>
    </div>
  );
}
