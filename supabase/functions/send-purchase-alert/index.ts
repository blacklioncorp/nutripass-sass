import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
const ONESIGNAL_REST_KEY = Deno.env.get("ONESIGNAL_REST_KEY");

const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("SUPABASE_URL_FALLBACK");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");

// Ensure we have URL and Key
const supabase = createClient(supabaseUrl!, supabaseKey!);

serve(async (req) => {
  try {
    const payload = await req.json();
    const transaction = payload.record || payload.transaction;

    // We only alert on debit (purchase)
    if (!transaction || transaction.type !== 'debit') {
      return new Response("Not a purchase or not debit", { status: 200 });
    }

    // Connect to Supabase to fetch consumer and parent securely
    const { data: wallet, error: walletErr } = await supabase
      .from('wallets')
      .select('balance, consumer_id')
      .eq('id', transaction.wallet_id)
      .single();

    if (walletErr || !wallet) {
      return new Response("No wallet found", { status: 200 });
    }

    const { data: consumer, error: consumerErr } = await supabase
      .from('consumers')
      .select('first_name, parent_id')
      .eq('id', wallet.consumer_id)
      .single();

    if (consumerErr || !consumer || !consumer.parent_id) {
      return new Response("No valid parent assigned", { status: 200 });
    }

    const parentId = consumer.parent_id;
    const consumerName = consumer.first_name;
    
    // Fetch parent's email from auth admin
    const { data: { user: parentUser } } = await supabase.auth.admin.getUserById(parentId);
    const parentEmail = parentUser?.email;

    const amount = parseFloat(transaction.amount);
    const currentBalance = parseFloat(wallet.balance as any);
    const triggerOverdraftAlert = currentBalance < 0;
    
    let subject = `Confirmación de Compra - NutriPass (${consumerName})`;
    let htmlMsg = `<h3>Se ha registrado una de compra de ${consumerName} por $${amount.toFixed(2)}</h3>
                   <p>El saldo restante en su billetera es $${currentBalance.toFixed(2)}.</p>`;

    if (triggerOverdraftAlert) {
      subject = `⚠️ ALERTA: Saldo Negativo - NutriPass (${consumerName})`;
      htmlMsg = `<h2 style="color:red;">Alerta de Saldo Negativo</h2>
                 <p><b>${consumerName}</b> acaba de realizar un consumo por $${amount.toFixed(2)}, pero su saldo no era suficiente.</p>
                 <p>El sistema utilizó su <b>Fondo de Emergencia</b> para que no se quedara sin comer.</p>
                 <p style="font-size: 1.2rem; font-weight: bold; padding: 10px; background: #fee2e2; color: #991b1b; display: inline-block; border-radius: 8px;">
                   Nuevo saldo: -$${Math.abs(currentBalance).toFixed(2)}
                 </p>
                 <br/><br/>
                 <a href="https://nutripass-sass.vercel.app/parent" style="background:#2563eb;color:white;padding:12px 20px;text-decoration:none;border-radius:10px;font-weight:bold;">Recargar Billetera Ahora</a>`;
    }

    // 1. Send Email via Resend
    if (RESEND_API_KEY && parentEmail) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "NutriPass Alertas <notificaciones@nutripass.com>",
          to: [parentEmail],
          subject: subject,
          html: htmlMsg,
        }),
      });
    }

    // 2. Send Push Notification via OneSignal (as requested by user)
    if (ONESIGNAL_APP_ID && ONESIGNAL_REST_KEY && parentId) {
      await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${ONESIGNAL_REST_KEY}`,
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          include_external_user_ids: [parentId],
          headings: { "en": "Notificación NutriPass", "es": "Notificación NutriPass" },
          contents: { "en": "Compra registrada.", "es": subject },
          url: "https://nutripass-sass.vercel.app/parent"
        }),
      });
    }

    return new Response(JSON.stringify({ success: true, emailSentTo: parentEmail }), { headers: { "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
