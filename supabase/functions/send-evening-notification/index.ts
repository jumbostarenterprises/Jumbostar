import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: tokensData } = await supabase.from('device_tokens').select('token');
    const tokens = tokensData?.map(t => t.token) || [];

    if (tokens.length === 0) return new Response(JSON.stringify({ message: 'No tokens' }));

    const message = {
      title: "Fast Shipping 🚀",
      body: "Same day delivery available check it"
    };

    console.log(`Sending evening notification to ${tokens.length} devices.`);
    return new Response(JSON.stringify({ success: true, message: message.body }));
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})