import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = "La Docta Vende <notificaciones@ladoctavende.com.ar>";

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

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing Supabase environment variables");

        const { createClient } = await import("jsr:@supabase/supabase-js@2");
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 1. Check if enabled
        const { data: config } = await supabase.from('config').select('value').eq('key', 'email_payment_enabled').single();
        if (config?.value === 'false') {
            console.log("Email payment_confirmation is disabled. Skipping.");
            return new Response(JSON.stringify({ message: "Skipped by config" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const formattedDate = new Date(expiryDate).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <div style="background-color: #7f1d1d; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0;">¡Negocio Activo!</h1>
                </div>
                <div style="padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">
                    <p>Hola,</p>
                    <p>¡Buenas noticias! Tu negocio <strong>${businessName}</strong> ha sido activado correctamente en <strong>La Docta Vende</strong>.</p>
                    <p>Tu suscripción está vigente hasta el <strong>${formattedDate}</strong>.</p>
                    <p>Gracias por confiar en nosotros para conectar tu negocio con los vecinos de Córdoba.</p>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://ladoctavende.com.ar" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ir a La Docta Vende</a>
                    </div>
                </div>
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
                subject: `✅ ¡Tu negocio ${businessName} ya está activo!`,
                html: html,
            }),
        });

        const resData = await res.json();
        console.log("Resend Response:", JSON.stringify(resData));

        // 2. Log activity
        await supabase.from('email_logs').insert({
            type: 'payment_confirmation',
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
