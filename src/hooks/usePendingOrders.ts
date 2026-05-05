'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * Hook para obtener el conteo de órdenes pendientes (estatus 'paid') para el día de hoy.
 * Utiliza { count: 'exact', head: true } para optimizar la consulta y no descargar datos innecesarios.
 */
export function usePendingOrders() {
  const [count, setCount] = useState<number>(0);
  const supabase = createClient();

  const fetchCount = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { count: orderCount, error } = await supabase
      .from('pre_orders')
      .select('*', { count: 'exact', head: true })
      .eq('order_date', today)
      .eq('status', 'paid'); // En SafeLunch, 'paid' indica órdenes por preparar/entregar

    if (!error && orderCount !== null) {
      setCount(orderCount);
    }
  };

  useEffect(() => {
    fetchCount();

    // Suscripción en tiempo real para que el badge se actualice al instante
    const channel = supabase
      .channel('realtime_pending_orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pre_orders' },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return count;
}
