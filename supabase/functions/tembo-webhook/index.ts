import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function validateHmacSignature(timestamp: string, payload: string, signature: string, hashKeyB64: string): boolean {
  try {
    const signingContent = timestamp + payload
    const keyBytes = Uint8Array.from(atob(hashKeyB64), (c) => c.charCodeAt(0))
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signingContent))
    const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    return signature === expectedB64
  } catch {
    return false
  }
}

async function sendBriqSms(phone: string, message: string): Promise<void> {
  const apiKey = Deno.env.get('BRIQ_API_KEY')
  if (!apiKey) return
  try {
    await fetch('https://api.briq.sh/v1/sms', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: phone, message }),
    })
  } catch {
    /* ignore */
  }
}

function successResponse(): Response {
  return new Response(JSON.stringify({ message: 'Transaction processed successfully' }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()

    // Format 1: Merchant Collection Accounts - timestamp, signature, payload (HMAC)
    const timestamp = body?.timestamp
    const signature = body?.signature
    const payloadStr = body?.payload

    if (timestamp && signature && payloadStr) {
      const hashKey = Deno.env.get('TEMBO_HASH_KEY')
      if (!hashKey) {
        return new Response(JSON.stringify({ error: 'TEMBO_HASH_KEY not configured for webhook verification' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (!validateHmacSignature(timestamp, payloadStr, signature, hashKey)) {
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let payload: { transaction?: { id: string; reference?: string; creditOrDebit?: string; amountCredit?: number }; event?: string }
      try {
        payload = typeof payloadStr === 'string' ? JSON.parse(payloadStr) : payloadStr
      } catch {
        return successResponse()
      }

      const txId = payload?.transaction?.id
      const ref = payload?.transaction?.reference
      const isCredit = payload?.transaction?.creditOrDebit === 'CREDIT'

      if (!txId && !ref) return successResponse()

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      let tx = ref
        ? (await supabase.from('transactions').select('id, user_id, amount, status').eq('id', ref).maybeSingle()).data
        : null
      if (!tx && txId) {
        tx = (await supabase.from('transactions').select('id, user_id, amount, status').eq('tembo_transaction_id', txId).maybeSingle()).data
      }

      if (tx && tx.status === 'PENDING' && isCredit) {
        await supabase.from('transactions').update({ status: 'AUTHORIZED' }).eq('id', tx.id)
        const { data: profile } = await supabase.from('user_profiles').select('account_balance, phone_number').eq('id', tx.user_id).single()
        if (profile) {
          const newBalance = Number(profile.account_balance) - Number(tx.amount)
          await supabase.from('user_profiles').update({ account_balance: newBalance }).eq('id', tx.user_id)
          if (profile.phone_number && profile.phone_number !== 'pending') {
            await sendBriqSms(profile.phone_number, `FaceLipa: Payment of ${tx.amount} TZS completed. New balance: ${newBalance} TZS.`)
          }
        }
      }

      return new Response(JSON.stringify({ message: 'Transaction processed successfully', transactionId: txId }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Format 2: MOMO Collection webhook - statusCode, transactionId, transactionRef
    const statusCode = body?.statusCode
    const transactionId = body?.transactionId
    const transactionRef = body?.transactionRef

    if (!transactionRef && !transactionId) return successResponse()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let tx = (await supabase.from('transactions').select('id, user_id, amount, status').eq('tembo_transaction_id', transactionId ?? transactionRef).maybeSingle()).data
    if (!tx && transactionRef) {
      tx = (await supabase.from('transactions').select('id, user_id, amount, status').eq('id', transactionRef).maybeSingle()).data
    }

    if (!tx || tx.status !== 'PENDING') return successResponse()

    const isAccepted = statusCode === 'PAYMENT_ACCEPTED'

    if (isAccepted) {
      await supabase.from('transactions').update({ status: 'AUTHORIZED' }).eq('id', tx.id)
      const { data: profile } = await supabase.from('user_profiles').select('account_balance, phone_number').eq('id', tx.user_id).single()
      if (profile) {
        const newBalance = Number(profile.account_balance) - Number(tx.amount)
        await supabase.from('user_profiles').update({ account_balance: newBalance }).eq('id', tx.user_id)
        if (profile.phone_number && profile.phone_number !== 'pending') {
          await sendBriqSms(profile.phone_number, `FaceLipa: Payment of ${tx.amount} TZS completed. New balance: ${newBalance} TZS.`)
        }
      }
    } else {
      await supabase.from('transactions').update({ status: 'FAILED' }).eq('id', tx.id)
    }

    return new Response(JSON.stringify({ message: 'Transaction processed successfully', transactionId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
