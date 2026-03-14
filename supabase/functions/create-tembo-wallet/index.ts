import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createTemboWallet } from '../_shared/tembo.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const userId = req.headers.get('x-user-id')
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing x-user-id header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      idType,
      idNumber,
      idIssueDate,
      idExpiryDate,
      street,
      city,
      postalCode,
      mobileNo,
      email,
    } = body || {}

    const errors: string[] = []
    if (!firstName?.trim()) errors.push('firstName required')
    if (!lastName?.trim()) errors.push('lastName required')
    if (!dateOfBirth?.trim()) errors.push('dateOfBirth required')
    if (!['M', 'F'].includes(gender)) errors.push('gender must be M or F')
    if (!['NATIONAL_ID', 'DRIVER_LICENSE', 'VOTER_ID', 'INTL_PASSPORT'].includes(idType)) errors.push('idType required')
    if (!idNumber?.trim()) errors.push('idNumber required')
    if (!idIssueDate?.trim()) errors.push('idIssueDate required')
    if (!idExpiryDate?.trim()) errors.push('idExpiryDate required')
    if (!street?.trim()) errors.push('street required')
    if (!city?.trim()) errors.push('city required')
    if (!postalCode?.trim()) errors.push('postalCode required')
    if (!mobileNo?.trim()) errors.push('mobileNo required')
    if (!email?.trim()) errors.push('email required')

    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: errors.join('. ') }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('external_user_id', userId)
      .single()

    if (!profile) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const result = await createTemboWallet({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth: dateOfBirth.trim(),
      gender,
      idType,
      idNumber: idNumber.trim(),
      idIssueDate: idIssueDate.trim(),
      idExpiryDate: idExpiryDate.trim(),
      street: street.trim(),
      city: city.trim(),
      postalCode: postalCode.trim(),
      mobileNo: mobileNo.trim(),
      email: email.trim(),
      externalCustomerRef: userId,
    })

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: walletErr } = await supabase.from('wallets').insert({
      user_id: profile.id,
      provider: 'tembo',
      provider_wallet_id: result.accountNo!,
      currency: 'TZS',
    })
    if (walletErr && !walletErr.message?.includes('duplicate')) throw walletErr

    return new Response(
      JSON.stringify({ accountNo: result.accountNo, message: 'Tembo wallet created' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
