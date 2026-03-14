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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, account_balance')
      .eq('external_user_id', userId)
      .single()

    const balance = profile ? Number(profile.account_balance) || 0 : 0
    const profileId = profile?.id

    let wallets: unknown[] = []
    if (profileId) {
      const { data: w } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', profileId)
      wallets = w || []
    }
    let transactions: unknown[] = []
    if (profileId) {
      const { data: t } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false })
        .limit(5)
      transactions = t || []
    }

    return new Response(
      JSON.stringify({ balance, wallets, transactions }),
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
