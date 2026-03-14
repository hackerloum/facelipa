import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').replace(/^0/, '255')
  return digits.startsWith('255') ? digits : `255${digits}`
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()

    const firstName = body?.first_name?.trim()
    const lastName = body?.last_name?.trim()
    const phoneNumber = body?.phone_number?.trim()
    const email = body?.email?.trim()
    const externalUserIdInput = body?.external_user_id?.trim()
    const walletProvider = body?.wallet_provider?.trim()
    const walletPhone = body?.wallet_phone?.trim() || phoneNumber
    const embedding = body?.embedding

    const errors: string[] = []
    if (!firstName) errors.push('First name is required')
    if (!lastName) errors.push('Last name is required')
    if (!phoneNumber) errors.push('Phone number is required')
    if (!walletProvider) errors.push('Wallet provider is required')
    if (externalUserIdInput && !isUuid(externalUserIdInput)) errors.push('external_user_id must be a valid UUID')
    if (!Array.isArray(embedding) || embedding.length !== 128) errors.push('Face photo is required - no face detected')

    const profilePhoneNorm = phoneNumber ? normalizePhone(phoneNumber) : ''
    if (profilePhoneNorm.length < 9) errors.push('Valid phone number is required')

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

    let existingProfile: { id: string; external_user_id: string } | null = null
    if (externalUserIdInput) {
      const { data: byExternal, error: byExternalErr } = await supabase
        .from('user_profiles')
        .select('id, external_user_id')
        .eq('external_user_id', externalUserIdInput)
        .limit(1)
      if (byExternalErr) throw byExternalErr
      existingProfile = byExternal?.[0] ?? null
    }

    if (!existingProfile) {
      const { data: byPhone, error: byPhoneErr } = await supabase
        .from('user_profiles')
        .select('id, external_user_id')
        .eq('phone_number', profilePhoneNorm)
        .limit(1)
      if (byPhoneErr) throw byPhoneErr
      existingProfile = byPhone?.[0] ?? null
    }

    if (!existingProfile && email) {
      const { data: byEmail, error: byEmailErr } = await supabase
        .from('user_profiles')
        .select('id, external_user_id')
        .ilike('email', email)
        .limit(1)
      if (byEmailErr) throw byEmailErr
      existingProfile = byEmail?.[0] ?? null
    }

    const externalUserId = existingProfile?.external_user_id || externalUserIdInput || crypto.randomUUID()
    let profileId = existingProfile?.id as string | undefined
    if (!profileId) {
      const { data: createdProfile, error: profileErr } = await supabase
        .from('user_profiles')
        .insert({
          external_user_id: externalUserId,
          phone_number: profilePhoneNorm,
          first_name: firstName,
          last_name: lastName,
          email: email || null,
          account_balance: 0,
        })
        .select('id')
        .single()
      if (profileErr) throw profileErr
      profileId = createdProfile!.id
    } else {
      const { error: profileUpdateErr } = await supabase
        .from('user_profiles')
        .update({
          phone_number: profilePhoneNorm,
          first_name: firstName,
          last_name: lastName,
          email: email || null,
        })
        .eq('id', profileId)
      if (profileUpdateErr) throw profileUpdateErr
    }

    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', profileId)
      .eq('provider', walletProvider)
      .maybeSingle()

    if (!existingWallet) {
      const { error: walletInsertErr } = await supabase.from('wallets').insert({
        user_id: profileId,
        provider: walletProvider,
        provider_wallet_id: walletPhoneNorm,
        currency: 'TZS',
      })
      if (walletInsertErr) throw walletInsertErr
    } else {
      const { error: walletUpdateErr } = await supabase
        .from('wallets')
        .update({
          provider_wallet_id: walletPhoneNorm,
          currency: 'TZS',
        })
        .eq('id', existingWallet.id)
      if (walletUpdateErr) throw walletUpdateErr
    }

    const embeddingStr = `[${embedding.join(',')}]`
    const { data: existingEmbedding } = await supabase
      .from('face_embeddings')
      .select('id')
      .eq('user_id', profileId)
      .maybeSingle()

    if (!existingEmbedding) {
      const { error: faceInsertErr } = await supabase.from('face_embeddings').insert({
        user_id: profileId,
        embedding: embeddingStr,
      })
      if (faceInsertErr) throw faceInsertErr
    } else {
      const { error: faceUpdateErr } = await supabase
        .from('face_embeddings')
        .update({ embedding: embeddingStr })
        .eq('id', existingEmbedding.id)
      if (faceUpdateErr) throw faceUpdateErr
    }

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
