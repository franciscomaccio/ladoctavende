import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = "La Docta Vende <notificaciones@ladoctavende.com.ar>";
const RENEWAL_URL = "https://ladoctavende.com.ar/#/dashboard";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { email, businessName, expiryDate } = await req.json();

        if (!email || !businessName || !expiryDate) {
            throw new Error("Missing required parameters");
        }

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase environment variables");

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const formattedDate = new Date(expiryDate).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const html = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 24px;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">La Docta Vende</h1>
                </div>
                <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                    <h2 style="color: #991b1b; margin-top: 0;">⛔ Tu suscripción ha finalizado</h2>
                    <p style="color: #7f1d1d; font-size: 16px;">Te escribimos para recordarte que la suscripción de <strong>${businessName}</strong> finalizó el <strong>${formattedDate}</strong> y tu negocio ya no aparece en La Docta Vende.</p>
                    <p style="color: #7f1d1d; font-size: 16px;">¡Podés reactivarla cuando quieras para volver a conectar con los vecinos de Córdoba!</p>
                    <div style="text-align: center; margin-top: 24px;">
                        <a href="${RENEWAL_URL}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">Renovar Ahora</a>
                    </div>
                </div>
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">Este email fue enviado desde La Docta Vende</p>
            </div>
        `;

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + RESEND_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: RESEND_FROM_EMAIL,
                to: [email],
                subject: `⛔ ¡Recordatorio! La suscripción de ${businessName} finalizó`,
                html: html,
            }),
        });

        const resData = await res.json();
        console.log("Resend Response:", JSON.stringify(resData));

        // Log activity
        await supabase.from('email_logs').insert({
            type: 'manual_expiration_reminder',
            recipient: email,
            status: res.ok ? 'success' : 'error',
            error_message: res.ok ? null : JSON.stringify(resData)
        });

        return new Response(JSON.stringify(resData), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
