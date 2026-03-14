import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const statusCode = body?.statusCode
    const transactionId = body?.transactionId
    const transactionRef = body?.transactionRef

    if (!transactionRef && !transactionId) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Match by tembo_transaction_id or transaction ref (our tx id)
    let { data: tx } = await supabase
      .from('transactions')
      .select('id, user_id, amount, status')
      .eq('tembo_transaction_id', transactionId ?? transactionRef)
      .maybeSingle()

    if (!tx && transactionRef) {
      const res = await supabase
        .from('transactions')
        .select('id, user_id, amount, status')
        .eq('id', transactionRef)
        .maybeSingle()
      tx = res.data
    }

    if (!tx || tx.status !== 'PENDING') {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isAccepted = statusCode === 'PAYMENT_ACCEPTED'

    if (isAccepted) {
      await supabase.from('transactions').update({ status: 'AUTHORIZED' }).eq('id', tx.id)

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('account_balance, phone_number')
        .eq('id', tx.user_id)
        .single()

      if (profile) {
        const newBalance = Number(profile.account_balance) - Number(tx.amount)
        await supabase
          .from('user_profiles')
          .update({ account_balance: newBalance })
          .eq('id', tx.user_id)

        if (profile.phone_number && profile.phone_number !== 'pending') {
          await sendBriqSms(
            profile.phone_number,
            `FaceLipa: Payment of ${tx.amount} TZS completed. New balance: ${newBalance} TZS.`
          )
        }
      }
    } else {
      await supabase.from('transactions').update({ status: 'FAILED' }).eq('id', tx.id)
    }

    return new Response(JSON.stringify({ received: true }), {
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
