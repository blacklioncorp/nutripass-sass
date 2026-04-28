import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { user_id, title, message } = await request.json();

    if (!user_id || !title || !message) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // 1. Obtener el push_token de Supabase usando el Admin Client
    const supabase = await createAdminClient();
    const { data: profile, error: dbError } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', user_id)
      .single();

    if (dbError || !profile || !profile.push_token) {
      return NextResponse.json({ error: 'Usuario no tiene un token de notificaciones válido' }, { status: 404 });
    }

    const pushToken = profile.push_token;

    // 2. Preparar el payload para la API de OneSignal
    const oneSignalPayload = {
      app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
      include_subscription_ids: [pushToken],
      headings: { en: title, es: title },
      contents: { en: message, es: message },
    };

    // 3. Hacer el POST a la API REST de OneSignal
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(oneSignalPayload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OneSignal API Error: ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();

    return NextResponse.json({ success: true, data: responseData });

  } catch (error: any) {
    console.error('Error enviando notificación:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
