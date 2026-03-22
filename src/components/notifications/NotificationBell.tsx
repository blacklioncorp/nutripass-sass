
'use client';

import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { query, collection, orderBy, limit, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export default function NotificationBell({ userId }: { userId: string }) {
  const db = useFirestore();
  const [isOpen, setIsOpen] = useState(false);

  const notificationsQuery = useMemoFirebase(() => 
    query(
      collection(db, 'profiles', userId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(20)
    ), 
    [db, userId]
  );

  const { data: notifications, isLoading } = useCollection(notificationsQuery);
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  const markAllAsRead = async () => {
    if (!notifications) return;
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (!n.isRead) {
        const ref = doc(db, 'profiles', userId, 'notifications', n.id);
        batch.update(ref, { isRead: true });
      }
    });
    await batch.commit();
  };

  const markAsRead = async (id: string) => {
    const ref = doc(db, 'profiles', userId, 'notifications', id);
    await updateDoc(ref, { isRead: true });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-primary/10">
          <Bell className="h-6 w-6 text-foreground" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] font-black border-2 border-white animate-in zoom-in"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col border-l-4 border-primary">
        <SheetHeader className="p-6 bg-slate-50 border-b">
          <div className="flex justify-between items-center">
            <SheetTitle className="text-2xl font-black flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Notificaciones
            </SheetTitle>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs font-black text-primary hover:bg-primary/5"
                onClick={markAllAsRead}
              >
                MARCAR TODAS
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground animate-pulse font-bold">Cargando alertas...</div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="p-20 text-center flex flex-col items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
                <Bell className="h-10 w-10 text-slate-300" />
              </div>
              <p className="text-slate-400 font-bold">No tienes notificaciones aún.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-6 transition-colors hover:bg-slate-50 cursor-pointer relative",
                    !n.isRead && "bg-primary/5"
                  )}
                  onClick={() => markAsRead(n.id)}
                >
                  {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-sm uppercase tracking-tight">{n.title}</h4>
                      <span className="text-[10px] font-black text-muted-foreground uppercase">
                        {format(new Date(n.createdAt), 'HH:mm', { locale: es })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 font-medium leading-relaxed">{n.message}</p>
                    <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase">
                      {format(new Date(n.createdAt), "dd 'de' MMMM", { locale: es })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
