import { useState, useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { createClient } from '@/utils/supabase/client';

// Module-level singleton: persists across renders AND StrictMode double-invocations.
// This ensures OneSignal.init() is called AT MOST ONCE per page load.
let oneSignalInitialized = false;

export function usePushNotifications() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Prevent concurrent init calls within the same component instance
  const initInProgress = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    // OneSignal is domain-restricted to the production URL.
    // Skip initialization entirely outside of production to avoid SDK errors.
    const isProduction = typeof window !== 'undefined' &&
      window.location.hostname === 'www.safe-lunch.com';

    if (!isProduction) return;

    // Guard 1: already done globally (persists across StrictMode re-mounts)
    if (oneSignalInitialized) {
      setIsInitialized(true);
      setIsSubscribed(OneSignal.User.PushSubscription.optedIn ?? false);
      return;
    }
    // Guard 2: already in progress in this render cycle
    if (initInProgress.current) return;

    const initOneSignal = async () => {
      initInProgress.current = true;
      try {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID as string,
          allowLocalhostAsSecureOrigin: true,
        });

        // Mark globally so no future instance re-initializes
        oneSignalInitialized = true;

        // Identify user in OneSignal so targeted push notifications work
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          OneSignal.login(session.user.id);
        }

        setIsInitialized(true);
        setIsSubscribed(OneSignal.User.PushSubscription.optedIn ?? false);
      } catch (error: any) {
        // OneSignal throws if called twice — swallow gracefully and treat as initialized
        if (error?.message?.toLowerCase().includes('already initialized')) {
          oneSignalInitialized = true;
          setIsInitialized(true);
          setIsSubscribed(OneSignal.User.PushSubscription.optedIn ?? false);
        } else {
          console.error('Error al inicializar OneSignal:', error);
        }
      } finally {
        initInProgress.current = false;
      }
    };

    initOneSignal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps: run once on mount only

  const subscribeToNotifications = async () => {
    setIsLoading(true);
    try {
      // Request push permission via native slide-down prompt
      await OneSignal.Slidedown.promptPush();

      const isPushEnabled = OneSignal.User.PushSubscription.optedIn;
      if (isPushEnabled) {
        setIsSubscribed(true);

        const pushToken = OneSignal.User.PushSubscription.id;
        if (pushToken) {
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
