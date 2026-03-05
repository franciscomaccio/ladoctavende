import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    return new Response(JSON.stringify({ status: "ok", message: "Hello from Supabase Edge Functions!" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
});
