import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { initiatePayment } from '../_shared/payment.ts'
import { parseEmbedding, cosineSimilarity } from '../_shared/embedding.ts'

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
    const embedding = body?.embedding
    const amount = Number(body?.amount)
    const currency = body?.currency ?? 'TZS'

    if (!Array.isArray(embedding) || embedding.length !== 128) {
      return new Response(
        JSON.stringify({ error: 'embedding must be a 128-element number array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (isNaN(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'amount must be a positive number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user profile
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('id, account_balance, phone_number')
      .eq('external_user_id', userId)
      .single()

    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify embedding belongs to this user (cosine similarity)
    const { data: allEmbs } = await supabase
      .from('face_embeddings')
      .select('user_id, embedding')
      .eq('user_id', profile.id)

    const userEmbedding = allEmbs?.[0]?.embedding
    if (!userEmbedding) {
      return new Response(
        JSON.stringify({ error: 'Face not enrolled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const u = parseEmbedding(userEmbedding)
    const q = embedding.map(Number)
    const sim = cosineSimilarity(u, q)
    if (sim < 0.6) {
      return new Response(
        JSON.stringify({ error: 'Face match failed - identity not confirmed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Available balance = account_balance - sum(PENDING)
    const { data: pending } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', profile.id)
      .eq('status', 'PENDING')

    const pendingSum = (pending || []).reduce((s, t) => s + Number(t.amount), 0)
    const available = Number(profile.account_balance) - pendingSum
    if (available < amount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance', available }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get default wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, provider_wallet_id, provider')
      .eq('user_id', profile.id)
      .limit(1)
      .single()

    // Tembo wallet stores accountNo; STK push needs phone. Mobile money wallets store phone.
    const phone = wallet?.provider === 'tembo' ? profile.phone_number : (wallet?.provider_wallet_id ?? profile.phone_number)
    if (!phone || phone === 'pending') {
      return new Response(
        JSON.stringify({ error: 'No wallet linked - add a wallet first' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert transaction PENDING
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .insert({
        user_id: profile.id,
        wallet_id: wallet?.id ?? null,
        merchant_id: null,
        amount,
        currency,
        status: 'PENDING',
      })
      .select()
      .single()

    if (txErr) throw txErr

    const result = await initiatePayment(amount, phone, currency, tx!.id, wallet?.provider)

    if (result.error || !result.chargeId) {
      await supabase.from('transactions').update({ status: 'FAILED' }).eq('id', tx!.id)
      return new Response(
        JSON.stringify({ error: 'Payment initiation failed', detail: result.error, transaction: tx }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const updatePayload = result.provider === 'snippe'
      ? { snippe_charge_id: result.chargeId, payment_provider: 'snippe' }
      : { tembo_transaction_id: result.chargeId, payment_provider: 'tembo' }
    await supabase.from('transactions').update(updatePayload).eq('id', tx!.id)

    return new Response(
      JSON.stringify({
        ...tx,
        charge_id: result.chargeId,
        payment_provider: result.provider,
        message: 'Enter PIN on your phone to complete payment',
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
