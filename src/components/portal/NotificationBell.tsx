'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function NotificationBell({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    // 1. Fetch initial notifications
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    };
    
    fetchNotifications();

    // 2. Subscribe to realtime inserts
    const channel = supabase.channel('realtime_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase]);

  const handleOpen = async () => {
    setIsOpen(true);
    if (unreadCount > 0) {
      setUnreadCount(0);
      // Mark as read in background
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={handleOpen}
        className="relative p-3 rounded-full bg-white shadow-sm hover:shadow-md transition text-slate-700"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs font-black flex items-center justify-center rounded-full animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-4 w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-black text-slate-900">Notificaciones</h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-900 font-bold p-1">✕</button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                📭 No tienes notificaciones recientes.
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`p-4 border-b border-slate-50 transition hover:bg-slate-50 ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                  <h4 className="font-bold text-slate-900 text-sm">{n.title}</h4>
                  <p className="text-slate-500 text-xs mt-1">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-widest">{new Date(n.created_at).toLocaleString('es-ES')}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
