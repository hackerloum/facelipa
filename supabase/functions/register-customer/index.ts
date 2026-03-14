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

    const firstName = body?.first_name?.trim()
    const lastName = body?.last_name?.trim()
    const phoneNumber = body?.phone_number?.trim()
    const email = body?.email?.trim()
    const walletProvider = body?.wallet_provider?.trim()
    const walletPhone = body?.wallet_phone?.trim() || phoneNumber
    const embedding = body?.embedding

    const errors: string[] = []
    if (!firstName) errors.push('First name is required')
    if (!lastName) errors.push('Last name is required')
    if (!phoneNumber) errors.push('Phone number is required')
    if (!walletProvider) errors.push('Wallet provider is required')
    if (!Array.isArray(embedding) || embedding.length !== 128) errors.push('Face photo is required - no face detected')

    const walletPhoneNorm = walletPhone ? normalizePhone(walletPhone) : ''
    if (walletPhoneNorm.length < 9) errors.push('Valid wallet phone number is required')

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: errors.join('. ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const externalUserId = crypto.randomUUID()

    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .insert({
        external_user_id: externalUserId,
        phone_number: walletPhoneNorm,
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        account_balance: 0,
      })
      .select('id')
      .single()

    if (profileErr) throw profileErr

    const { error: walletErr } = await supabase.from('wallets').insert({
      user_id: profile!.id,
      provider: walletProvider,
      provider_wallet_id: walletPhoneNorm,
      currency: 'TZS',
    })
    if (walletErr) throw walletErr

    const embeddingStr = `[${embedding.join(',')}]`
    const { error: faceErr } = await supabase.from('face_embeddings').insert({
      user_id: profile!.id,
      embedding: embeddingStr,
    })
    if (faceErr) throw faceErr

    return new Response(
      JSON.stringify({
        user_id: externalUserId,
        message: 'Registration successful. You can now pay with your face.',
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
