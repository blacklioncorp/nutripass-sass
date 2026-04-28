import { useState, useEffect } from 'react';
import OneSignal from 'react-onesignal';
import { createClient } from '@/utils/supabase/client';

export function usePushNotifications() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const initOneSignal = async () => {
      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID as string,
          allowLocalhostAsSecureOrigin: true, // Útil para pruebas en localhost
        });
        setIsInitialized(true);
        setIsSubscribed(OneSignal.User.PushSubscription.optedIn ?? false);
      } catch (error) {
        console.error('Error al inicializar OneSignal:', error);
      }
    };

    if (!isInitialized) {
      initOneSignal();
    }
  }, [isInitialized]);

  // Función elegante para invocar la solicitud (Ej: botón en el Dashboard)
  const subscribeToNotifications = async () => {
    setIsLoading(true);
    try {
      // 1. Solicitar permiso de forma nativa (tras presionar el botón)
      await OneSignal.Slidedown.promptPush();

      // 2. Verificar si el usuario aceptó
      const isPushEnabled = OneSignal.User.PushSubscription.optedIn;
      if (isPushEnabled) {
        setIsSubscribed(true);

        // 3. Obtener el Subscription ID (Player ID)
        const pushToken = OneSignal.User.PushSubscription.id;
        
        if (pushToken) {
          // 4. Vincular el token en Supabase
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) throw new Error('Usuario no autenticado');

          const { error: dbError } = await supabase
            .from('profiles')
            .update({ push_token: pushToken })
            .eq('id', user.id);

          if (dbError) throw dbError;
          console.log('Push token vinculado correctamente.');
        }
      }
    } catch (error) {
      console.error('Error al suscribirse a notificaciones:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { isInitialized, isSubscribed, isLoading, subscribeToNotifications };
}
