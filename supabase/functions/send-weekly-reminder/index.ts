import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  try {
    // This is called by pg_cron every Friday at 4 PM
    
    // In production: Query all active parents where they haven't preordered yet
    console.log("Running weekly reminder job...");
    
    const subject = "Es hora de armar el menú de la próxima semana 🍲";
    const htmlMsg = `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
        <h2>Viernes de Planificación NutriPass</h2>
        <p>Asegura la comida y snacks saludables de hijo(a) para la próxima semana.</p>
        <a href="https://nutripass.com/parent/preorders" style="background-color: #004B87; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-top: 20px;">
          Entrar y Pre-ordenar Ahora
        </a>
      </div>
    `;

    if (RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "NutriPass <notificaciones@nutripass.com>",
          to: ["padre@example.com"], // In prod use: bcc: [array of all parent emails]
          subject: subject,
          html: htmlMsg,
        }),
      });
    }

    return new Response(JSON.stringify({ done: true }), { headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
