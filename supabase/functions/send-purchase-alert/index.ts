import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// For OneSignal Push Notifications (If configured)
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
const ONESIGNAL_REST_KEY = Deno.env.get("ONESIGNAL_REST_KEY");

serve(async (req) => {
  try {
    const payload = await req.json();
    const transaction = payload.record || payload.transaction;

    // We only alert on debit (purchase)
    if (transaction.type !== 'debit') {
      return new Response("Not a purchase", { status: 200 });
    }

    // Connect to Supabase to fetch consumer and parent emails securely
    // In a real Edge Function, use @supabase/supabase-js with Deno.env.get('SUPABASE_URL')
    
    // Stubbed: Determine if overdraft occurred
    const amount = parseFloat(transaction.amount);
    const triggerOverdraftAlert = false; // Logic to check wallet balance
    
    let subject = "Confirmación de Compra - NutriPass";
    let htmlMsg = `<h3>Se ha registrado una compra por $${amount}</h3>`;

    if (triggerOverdraftAlert) {
      subject = "⚠️ ALERTA: Uso de Fondo de Emergencia en NutriPass";
      htmlMsg = `<h3 style="color:red;">Tu alumno utilizó el fondo de emergencia para no quedarse sin comer. Su saldo es negativo. Por favor recarga.</h3>`;
    }

    // 1. Send Email via Resend
    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "NutriPass <notificaciones@nutripass.com>",
          to: ["padre@example.com"], // Must be dynamic in prod
          subject: subject,
          html: htmlMsg,
        }),
      });
    }

    // 2. Send Push Notification via OneSignal (as requested by user)
    if (ONESIGNAL_APP_ID && ONESIGNAL_REST_KEY) {
      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${ONESIGNAL_REST_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          include_external_user_ids: ["parent-uuid-here"], // Dynamic
          headings: { "en": "Notificación NutriPass", "es": "Notificación NutriPass" },
          contents: { "en": "Compra registrada.", "es": subject },
          url: "https://nutripass.com/parent"
        }),
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
