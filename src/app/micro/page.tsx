'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function MicroLogin() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    const supabase = createClient();
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/master`
      }
    });

    if (error) {
      setMessage('Error enviando enlace.');
    } else {
      setMessage('Enlace enviado. Revisa tu bandeja.');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-xs w-full">
        <div className="flex justify-center mb-12">
           <div className="h-4 w-4 rounded-full bg-slate-800 animate-pulse" />
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="access key"
            required
            autoComplete="off"
            spellCheck="false"
            className="w-full bg-slate-900/50 border border-slate-800 text-slate-300 px-4 py-3 rounded-lg focus:outline-none focus:border-slate-600 transition font-mono text-sm placeholder:text-slate-700 text-center shadow-inner"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-lg transition disabled:opacity-50 text-sm font-mono tracking-widest uppercase"
          >
            {loading ? '···' : 'Enter'}
          </button>
        </form>

        {message && (
          <p className="mt-8 text-center text-xs font-mono text-slate-500 animate-in fade-in">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
