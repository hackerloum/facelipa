import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing x-user-id header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const amount = Number(body?.amount)
    if (isNaN(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'amount must be a positive number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, account_balance')
      .eq('external_user_id', userId)
      .single()

    if (!profile) {
      const { data: newProfile, error: insertErr } = await supabase
        .from('user_profiles')
        .insert({ external_user_id: userId, phone_number: 'pending', account_balance: amount })
        .select('id, account_balance')
        .single()
      if (insertErr) throw insertErr
      return new Response(
        JSON.stringify({ balance: newProfile!.account_balance }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newBalance = (Number(profile.account_balance) || 0) + amount
    const { error } = await supabase
      .from('user_profiles')
      .update({ account_balance: newBalance })
      .eq('id', profile.id)

    if (error) throw error

    return new Response(
      JSON.stringify({ balance: newBalance }),
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
