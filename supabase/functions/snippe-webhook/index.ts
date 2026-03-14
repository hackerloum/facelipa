import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Optional: send SMS via Briq
async function sendBriqSms(phone: string, message: string): Promise<void> {
  const apiKey = Deno.env.get('BRIQ_API_KEY')
  if (!apiKey) return

  try {
    await fetch('https://api.briq.sh/v1/sms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: phone, message }),
    })
  } catch {
    // Ignore SMS failures
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const event = body?.event ?? body?.type
    const chargeId = body?.data?.reference ?? body?.data?.id ?? body?.reference ?? body?.id ?? body?.charge_id ?? body?.payment?.id

    if (!chargeId) {
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let { data: tx } = await supabase
      .from('transactions')
      .select('id, user_id, amount, status')
      .eq('snippe_charge_id', chargeId)
      .maybeSingle()

    if (!tx) {
      const res = await supabase
        .from('transactions')
        .select('id, user_id, amount, status')
        .eq('reference', chargeId)
        .maybeSingle()
      tx = res.data
    }

    if (!tx || tx.status !== 'PENDING') {
      return new Response(
        JSON.stringify({ received: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isCompleted =
      event === 'payment.completed' ||
      body?.status === 'completed' ||
      body?.data?.status === 'completed'

    if (isCompleted) {
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

        const webhookBase = Deno.env.get('WEBHOOK_BASE_URL')
        if (webhookBase && profile.phone_number && profile.phone_number !== 'pending') {
          await sendBriqSms(
            profile.phone_number,
            `FaceLipa: Payment of ${tx.amount} TZS completed. New balance: ${newBalance} TZS.`
          )
        }
      }
    } else {
      await supabase.from('transactions').update({ status: 'FAILED' }).eq('id', tx.id)
    }

    return new Response(
      JSON.stringify({ received: true }),
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
