import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').replace(/^0/, '255')
  return digits.startsWith('255') ? digits : `255${digits}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const phoneInput = body?.phone_number?.trim()
    const emailInput = body?.email?.trim()?.toLowerCase()

    if (!phoneInput) {
      return new Response(
        JSON.stringify({ error: 'phone_number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const phone = normalizePhone(phoneInput)
    if (phone.length < 9) {
      return new Response(
        JSON.stringify({ error: 'Valid phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('external_user_id, first_name, last_name, email, phone_number')
      .eq('phone_number', phone)
      .limit(1)

    if (error) throw error

    const profile = profiles?.[0]
    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'Account not found. Please register first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (emailInput) {
      const profileEmail = profile.email?.toLowerCase() || ''
      if (!profileEmail || profileEmail !== emailInput) {
        return new Response(
          JSON.stringify({ error: 'Phone and email do not match.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({
        user_id: profile.external_user_id,
        first_name: profile.first_name,
        last_name: profile.last_name,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
