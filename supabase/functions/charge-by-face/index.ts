import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { initiatePayment } from '../_shared/payment.ts'
import { parseEmbedding, cosineSimilarity } from '../_shared/embedding.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-merchant-id, x-merchant-api-key',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const merchantId = req.headers.get('x-merchant-id')
    const apiKey = req.headers.get('x-merchant-api-key')

    if (!merchantId || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing x-merchant-id or x-merchant-api-key header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const embedding = body?.embedding
    const amount = Number(body?.amount)
    const currency = body?.currency ?? 'TZS'
    const reference = body?.reference

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

    // Validate merchant
    const { data: merchant, error: merchantErr } = await supabase
      .from('merchants')
      .select('id')
      .eq('id', merchantId)
      .eq('api_key', apiKey)
      .single()

    if (merchantErr || !merchant) {
      return new Response(
        JSON.stringify({ error: 'Invalid merchant credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Search face_embeddings for nearest match (pgvector ANN)
    const embeddingStr = `[${embedding.join(',')}]`
    const { data: matches, error: matchErr } = await supabase.rpc('match_face_embedding', {
      query_embedding: embeddingStr,
      match_threshold: 0.6,
      match_count: 1,
    })

    let matchedUserId: string | null = null
    if (matchErr || !matches?.length) {
      // Fallback: fetch all embeddings and compute similarity in JS
      const { data: allEmbs } = await supabase
        .from('face_embeddings')
        .select('user_id, embedding')

      let bestSim = 0.6
      const q = embedding.map(Number)
      for (const row of allEmbs || []) {
        const u = parseEmbedding(row.embedding)
        const sim = cosineSimilarity(u, q)
        if (sim > bestSim) {
          bestSim = sim
          matchedUserId = row.user_id
        }
      }
    } else {
      matchedUserId = matches[0].user_id
    }

    if (!matchedUserId) {
      return new Response(
        JSON.stringify({ error: 'No matching face found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, account_balance, phone_number')
      .eq('id', matchedUserId)
      .single()

    if (!profile) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: pending } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', profile.id)
      .eq('status', 'PENDING')

    const pendingSum = (pending || []).reduce((s, t) => s + Number(t.amount), 0)
    const available = Number(profile.account_balance) - pendingSum
    if (available < amount) {
      return new Response(
        JSON.stringify({ error: 'Customer has insufficient balance', available }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
        JSON.stringify({ error: 'Customer has no wallet linked' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .insert({
        user_id: profile.id,
        wallet_id: wallet?.id ?? null,
        merchant_id: merchant.id,
        amount,
        currency,
        status: 'PENDING',
        reference: reference ?? null,
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
        message: 'Customer is entering PIN on their phone',
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
