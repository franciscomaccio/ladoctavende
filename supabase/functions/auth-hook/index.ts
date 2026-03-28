import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailEvent {
    user: {
        id: string;
        email: string;
    };
    email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: 'signup' | 'recovery' | 'email_change' | 'invite';
    };
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        const FROM_EMAIL = "La Docta Vende <notificaciones@ladoctavende.com.ar>";

        if (!RESEND_API_KEY) {
            throw new Error("Missing RESEND_API_KEY");
        }

        const body: AuthEmailEvent = await req.json();
        const { user, email_data } = body;
        let { token_hash, email_action_type, redirect_to } = email_data;

        // Force production redirect if it comes from localhost
        if (redirect_to.includes('localhost')) {
            redirect_to = "https://ladoctavende.com.ar/#/dashboard";
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase environment variables");

        const { createClient } = await import("jsr:@supabase/supabase-js@2");
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Check if this email type is enabled
        const configKey = email_action_type === 'signup' ? 'email_signup_enabled' : null;
        if (configKey) {
            const { data: config } = await supabase.from('config').select('value').eq('key', configKey).single();
            if (config?.value === 'false') {
                console.log(`Email \${email_action_type} is disabled in config. Skipping.`);
                return new Response(JSON.stringify({ message: "Skipped by config" }), {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200,
                });
            }
        }

        const confirmationUrl = `\${supabaseUrl}/auth/v1/verify?token=\${token_hash}&type=\${email_action_type}&redirect_to=\${encodeURIComponent(redirect_to)}`;
        console.log("Confirmation URL generated:", confirmationUrl);

        let subject = "";
        let title = "";
        let buttonText = "";
        let message = "";

        if (email_action_type === 'signup') {
            subject = "📩 Confirma tu registro en La Docta Vende";
            title = "¡Bienvenido a La Docta Vende!";
            buttonText = "Confirmar mi cuenta";
            message = "Gracias por unirte a la plataforma para conectar negocios locales en Córdoba. Para empezar a publicar tu negocio, por favor confirma tu dirección de correo electrónico.";
        } else if (email_action_type === 'recovery') {
            subject = "🔒 Recupera tu contraseña - La Docta Vende";
            title = "Recuperar Contraseña";
            buttonText = "Cambiar mi contraseña";
            message = "Hemos recibido una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el siguiente botón para elegir una nueva.";
        } else {
            subject = "Notificación de La Docta Vende";
            title = "Acción Requerida";
            buttonText = "Continuar";
            message = "Haz clic en el botón para continuar con el proceso en la plataforma.";
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
                    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%); padding: 40px 20px; text-align: center; }
                    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
                    .content { padding: 40px; text-align: center; }
                    .content h2 { color: #1a1a1a; margin-top: 0; font-size: 22px; }
                    .content p { color: #4a4a4a; line-height: 1.6; font-size: 16px; margin-bottom: 30px; }
                    .button { display: inline-block; background-color: #dc2626; color: #ffffff !important; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px; transition: background-color 0.3s; }
                    .footer { background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #eeeeee; }
                    .footer p { color: #9ca3af; font-size: 14px; margin: 5px 0; }
                    .mission { font-style: italic; color: #6b7280; font-size: 13px; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>La Docta Vende</h1>
                    </div>
                    <div class="content">
                        <h2>\${title}</h2>
                        <p>\${message}</p>
                        <a href="\${confirmationUrl}" class="button">\${buttonText}</a>
                    </div>
                    <div class="footer">
                        <p><strong>La Docta Vende</strong> - Córdoba, Argentina</p>
                        <p>¿Tienes dudas? Escríbenos a <a href="mailto:administracion@ladoctavende.com.ar" style="color: #dc2626; text-decoration: none;">administracion@ladoctavende.com.ar</a></p>
                        <p class="mission">"Buscamos ayudar a los vecinos para que descubran y se conecten con los negocios de su barrio de forma simple."</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + RESEND_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [user.email],
                subject: subject,
                html: html,
            }),
        });

        const resData = await res.json();
        console.log("Resend Response:", JSON.stringify(resData, null, 2));

        // 2. Log activity
        await supabase.from('email_logs').insert({
            type: email_action_type,
            recipient: user.email,
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
