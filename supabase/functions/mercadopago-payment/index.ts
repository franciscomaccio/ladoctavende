import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { MercadopagoConfig, Preference, Payment } from "npm:mercadopago";

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing required environment variables.");
}

const client = new MercadopagoConfig({ accessToken: MP_ACCESS_TOKEN || "" });
const supabaseAdmin = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_ROLE_KEY || "");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    const { method } = req;

    if (method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    if (method === "GET") {
        return new Response(JSON.stringify({ status: "active", message: "Ladoctavende MP Function" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    try {
        const body = await req.json();
        console.log("Request Body:", JSON.stringify(body));

        // 1. Webhook logic (Mercado Pago calling us)
        if (body.type === 'payment' || body.action?.includes('payment')) {
            const paymentId = body.data?.id || body.resource?.split('/').pop();
            console.log(`Processing Webhook for Payment ID: ${paymentId}`);

            if (!paymentId) {
                return new Response(JSON.stringify({ error: 'No ID found' }), { status: 400 });
            }

            const payment = await new Payment(client).get({ id: paymentId });
            console.log(`Payment Status: ${payment.status}, Ref: ${payment.external_reference}`);

            if (payment.status === 'approved') {
                const businessId = payment.external_reference;

                if (businessId) {
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + 30);

                    const { error: updateError } = await supabaseAdmin
                        .from('businesses')
                        .update({
                            active: true,
                            subscription_expires_at: expiryDate.toISOString()
                        })
                        .eq('id', businessId);

                    if (updateError) {
                        console.error(`Error activating business: ${updateError.message}`);
                        return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
                    }

                    console.log(`Business ${businessId} successfully activated until ${expiryDate.toISOString()}`);
                }
            }

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // 2. Preference creation (Frontend calling us)
        const { businessId, businessName, amount, email } = body;

        if (!businessId || !amount) {
            return new Response(JSON.stringify({ error: 'Missing businessId or amount' }), { status: 400 });
        }

        // Use a clean version of the current request URL for the webhook
        // or a hardcoded one if preferred.
        const notificationUrl = `${SUPABASE_URL}/functions/v1/mercadopago-payment`;

        const preference = await new Preference(client).create({
            body: {
                items: [
                    {
                        id: businessId,
                        title: `Ladoctavende - Alta de Negocio: ${businessName}`,
                        quantity: 1,
                        unit_price: Number(amount),
                        currency_id: 'ARS',
                    }
                ],
                payer: {
                    email: email,
                },
                external_reference: businessId,
                notification_url: notificationUrl,
                back_urls: {
                    success: `https://franciscomaccio.github.io/ladoctavende/#/dashboard?status=success`,
                    failure: `https://franciscomaccio.github.io/ladoctavende/#/dashboard?status=failure`,
                    pending: `https://franciscomaccio.github.io/ladoctavende/#/dashboard?status=pending`,
                },
                auto_return: 'approved',
            }
        });

        return new Response(JSON.stringify({ url: preference.init_point }), {
            headers: {
                ...corsHeaders,
                "Content-Type": "application/json"
            },
            status: 200,
        });

    } catch (error) {
        console.error(`Edge Function Error: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
