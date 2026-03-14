import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RENEWAL_URL = 'https://franciscomaccio.github.io/ladoctavende/#/';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Ladoctavende <notificaciones@ladoctavende.com.ar>';

        if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Missing environment variables');
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Get today and yesterday in Argentina timezone (UTC-3)
        const now = new Date();
        const argentinaTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        const todayStr = argentinaTime.toISOString().split('T')[0]; // YYYY-MM-DD

        const yesterday = new Date(argentinaTime);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const tomorrow = new Date(argentinaTime);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const results = { expiring_today: 0, expired_yesterday: 0, errors: [] as string[] };

        // 1. Businesses expiring TODAY — send reminder
        // subscription_expires_at between today 00:00 and tomorrow 00:00
        const { data: expiringToday, error: err1 } = await supabase
            .from('businesses')
            .select('id, name, owner_id, profiles!businesses_owner_id_fkey(email)')
            .gte('subscription_expires_at', todayStr)
            .lt('subscription_expires_at', tomorrowStr)
            .eq('active', true);

        if (err1) {
            console.error('Error querying expiring today:', err1);
            results.errors.push(`Query expiring: ${err1.message}`);
        }

        if (expiringToday && expiringToday.length > 0) {
            for (const biz of expiringToday) {
                const email = (biz as any).profiles?.email;
                if (!email) continue;

                // Skip if already notified today
                const { data: checkBiz } = await supabase
                    .from('businesses')
                    .select('notification_sent_at')
                    .eq('id', biz.id)
                    .single();

                if (checkBiz?.notification_sent_at) {
                    const lastNotif = checkBiz.notification_sent_at.split('T')[0];
                    if (lastNotif === todayStr) continue;
                }

                try {
                    await sendEmail(RESEND_API_KEY, {
                        from: RESEND_FROM_EMAIL,
                        to: email,
                        subject: `⏰ Tu suscripción en Ladoctavende vence hoy`,
                        html: buildExpiringEmail(biz.name),
                    });

                    await supabase
                        .from('businesses')
                        .update({ notification_sent_at: new Date().toISOString() })
                        .eq('id', biz.id);

                    results.expiring_today++;
                    console.log(`Reminder sent to ${email} for business ${biz.name}`);
                } catch (e: any) {
                    console.error(`Failed to send reminder to ${email}:`, e.message);
                    results.errors.push(`Send to ${email}: ${e.message}`);
                }
            }
        }

        // 2. Businesses that expired YESTERDAY — notify + deactivate
        // subscription_expires_at between yesterday 00:00 and today 00:00
        const { data: expiredYesterday, error: err2 } = await supabase
            .from('businesses')
            .select('id, name, owner_id, profiles!businesses_owner_id_fkey(email)')
            .gte('subscription_expires_at', yesterdayStr)
            .lt('subscription_expires_at', todayStr)
            .eq('active', true);

        if (err2) {
            console.error('Error querying expired yesterday:', err2);
            results.errors.push(`Query expired: ${err2.message}`);
        }

        if (expiredYesterday && expiredYesterday.length > 0) {
            for (const biz of expiredYesterday) {
                const email = (biz as any).profiles?.email;
                if (!email) continue;

                try {
                    // Deactivate the business
                    await supabase
                        .from('businesses')
                        .update({ active: false, notification_sent_at: new Date().toISOString() })
                        .eq('id', biz.id);

                    await sendEmail(RESEND_API_KEY, {
                        from: RESEND_FROM_EMAIL,
                        to: email,
                        subject: `😔 Tu suscripción en Ladoctavende finalizó`,
                        html: buildExpiredEmail(biz.name),
                    });

                    results.expired_yesterday++;
                    console.log(`Expiration notice sent to ${email} for business ${biz.name}`);
                } catch (e: any) {
                    console.error(`Failed to send expiration to ${email}:`, e.message);
                    results.errors.push(`Expire ${email}: ${e.message}`);
                }
            }
        }

        console.log('Notification results:', results);

        return new Response(JSON.stringify(results), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error('Edge Function Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

function buildExpiringEmail(businessName: string): string {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 24px;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Ladoctavende</h1>
            </div>
            <div style="background: #fefce8; border: 1px solid #fde047; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="color: #854d0e; margin-top: 0;">⏰ Tu suscripción vence hoy</h2>
                <p style="color: #713f12; font-size: 16px;">La suscripción de tu negocio <strong>${businessName}</strong> vence <strong>hoy</strong>.</p>
                <p style="color: #713f12; font-size: 16px;">Renová ahora para seguir apareciendo en Ladoctavende:</p>
                <div style="text-align: center; margin-top: 16px;">
                    <a href="${RENEWAL_URL}" style="display: inline-block; background: #009ee3; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">Renovar Suscripción</a>
                </div>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">Este email fue enviado automáticamente desde Ladoctavende</p>
        </div>
    `;
}

function buildExpiredEmail(businessName: string): string {
    return `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 24px;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Ladoctavende</h1>
            </div>
            <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="color: #991b1b; margin-top: 0;">😔 Tu suscripción finalizó</h2>
                <p style="color: #7f1d1d; font-size: 16px;">La suscripción de <strong>${businessName}</strong> ha expirado y tu negocio ya no aparece en Ladoctavende.</p>
                <p style="color: #7f1d1d; font-size: 16px;">¡Podés renovarla cuando quieras!</p>
                <div style="text-align: center; margin-top: 16px;">
                    <a href="${RENEWAL_URL}" style="display: inline-block; background: #16a34a; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">Renovar Ahora</a>
                </div>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">Este email fue enviado automáticamente desde Ladoctavende</p>
        </div>
    `;
}

async function sendEmail(apiKey: string, { from, to, subject, html }: { from: string; to: string; subject: string; html: string }) {
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to: [to],
            subject,
            html,
        }),
    });

    if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Resend API error ${res.status}: ${errorBody}`);
    }

    return await res.json();
}
