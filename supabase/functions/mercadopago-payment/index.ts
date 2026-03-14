import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
        return new Response(JSON.stringify({ status: "active", message: "Ladoctavende MP REST API Mode" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    try {
        const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Configuración incompleta en Supabase (Secrets).");
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const body = await req.json();

        // 1. Webhook logic (Mercado Pago notifying us)
        if (body.type === 'payment' || body.action?.includes('payment')) {
            const paymentId = body.data?.id || body.resource?.split('/').pop();
            if (!paymentId) return new Response(JSON.stringify({ error: 'No ID found' }), { status: 400 });

            console.log(`Processing Webhook for Payment ID: ${paymentId}`);

            const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` }
            });

            if (!paymentResponse.ok) throw new Error("Error fetching payment details from MP");
            const payment = await paymentResponse.json();

            if (payment.status === 'approved') {
                const businessId = payment.external_reference;
                const months = payment.additional_info?.items?.[0]?.category_id ? parseInt(payment.additional_info.items[0].category_id) : 1;

                if (businessId) {
                    const expiryDate = new Date();
                    expiryDate.setMonth(expiryDate.getMonth() + months);

                    await supabaseAdmin.from('businesses').update({
                        active: true,
                        subscription_expires_at: expiryDate.toISOString()
                    }).eq('id', businessId);

                    // Log the payment
                    await supabaseAdmin.from('payments').insert([{
                        business_id: businessId,
                        amount: payment.transaction_amount,
                        months: months,
                        payment_id: paymentId,
                        status: 'approved'
                    }]);

                    // Send confirmation email
                    const { data: business } = await supabaseAdmin
                        .from('businesses')
                        .select('name, profiles!businesses_owner_id_fkey(email)')
                        .eq('id', businessId)
                        .single();

                    if (business && (business as any).profiles?.email) {
                        try {
                            await fetch(`${SUPABASE_URL}/functions/v1/send-confirmation-email`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    email: (business as any).profiles.email,
                                    businessName: business.name,
                                    expiryDate: expiryDate.toISOString()
                                })
                            });
                        } catch (emailErr) {
                            console.error('Error triggering confirmation email:', emailErr);
                        }
                    }

                    console.log(`Business ${businessId} activated and notified.`);
                }
            }
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
        }

        // 2. Preference creation (Frontend calling us)
        const { businessId, businessName, amount, email, months } = body;
        if (!businessId || !amount || !months) {
            return new Response(JSON.stringify({ error: 'Missing businessId, amount or months' }), { status: 400 });
        }

        const notificationUrl = `${SUPABASE_URL}/functions/v1/mercadopago-payment`;

        const prefResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: [{
                    id: businessId,
                    title: `Ladoctavende - Alta de Negocio: ${businessName}`,
                    quantity: 1,
                    unit_price: Number(amount),
                    currency_id: 'ARS',
                    category_id: months.toString(), // We use category_id to store months temporarily for the webhook
                }],
                payer: { email },
                external_reference: businessId,
                notification_url: notificationUrl,
                back_urls: {
                    success: `https://franciscomaccio.github.io/ladoctavende/#/dashboard?status=success`,
                    failure: `https://franciscomaccio.github.io/ladoctavende/#/dashboard?status=failure`,
                    pending: `https://franciscomaccio.github.io/ladoctavende/#/dashboard?status=pending`,
                },
                auto_return: 'approved',
            })
        });

        if (!prefResponse.ok) {
            const errorData = await prefResponse.json();
            console.error("MP Preference Error:", errorData);
            throw new Error(`Error creating MP preference: ${errorData.message}`);
        }

        const preference = await prefResponse.json();

        return new Response(JSON.stringify({ url: preference.init_point }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });

    } catch (error: any) {
        console.error(`Edge Function Error: ${error.message}`);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
});
