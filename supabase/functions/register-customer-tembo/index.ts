import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createTemboWallet } from '../_shared/tembo.ts'

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
    const dateOfBirth = body?.date_of_birth?.trim()
    const gender = body?.gender?.toUpperCase()
    const idType = body?.id_type?.trim()
    const idNumber = body?.id_number?.trim()
    const idIssueDate = body?.id_issue_date?.trim()
    const idExpiryDate = body?.id_expiry_date?.trim()
    const street = body?.street?.trim()
    const city = body?.city?.trim()
    const postalCode = body?.postal_code?.trim()
    const embedding = body?.embedding

    const errors: string[] = []
    if (!firstName) errors.push('First name is required')
    if (!lastName) errors.push('Last name is required')
    if (!phoneNumber) errors.push('Phone number is required')
    if (!email) errors.push('Email is required')
    if (!dateOfBirth) errors.push('Date of birth is required')
    if (!['M', 'F'].includes(gender || '')) errors.push('Gender must be M or F')
    if (!['NATIONAL_ID', 'DRIVER_LICENSE', 'VOTER_ID', 'INTL_PASSPORT'].includes(idType || '')) errors.push('Valid ID type is required')
    if (!idNumber) errors.push('ID number is required')
    if (!idIssueDate) errors.push('ID issue date is required')
    if (!idExpiryDate) errors.push('ID expiry date is required')
    if (!street) errors.push('Street address is required')
    if (!city) errors.push('City is required')
    if (!postalCode) errors.push('Postal code is required')
    if (!Array.isArray(embedding) || embedding.length !== 128) errors.push('Face photo is required - no face detected')

    const phoneNorm = normalizePhone(phoneNumber || '')
    if (phoneNorm.length < 9) errors.push('Valid phone number is required')

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
        phone_number: phoneNorm,
        first_name: firstName,
        last_name: lastName,
        email: email,
        account_balance: 0,
      })
      .select('id')
      .single()

    if (profileErr) throw profileErr

    const temboResult = await createTemboWallet({
      firstName,
      lastName,
      dateOfBirth,
      gender: gender as 'M' | 'F',
      idType: idType as 'NATIONAL_ID' | 'DRIVER_LICENSE' | 'VOTER_ID' | 'INTL_PASSPORT',
      idNumber,
      idIssueDate,
      idExpiryDate,
      street,
      city,
      postalCode,
      mobileNo: phoneNorm,
      email,
      externalCustomerRef: externalUserId,
    })

    if (temboResult.error) {
      await supabase.from('user_profiles').delete().eq('id', profile!.id)
      return new Response(
        JSON.stringify({ error: `Tembo wallet creation failed: ${temboResult.error}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error: walletErr } = await supabase.from('wallets').insert({
      user_id: profile!.id,
      provider: 'tembo',
      provider_wallet_id: temboResult.accountNo!,
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
        tembo_account_no: temboResult.accountNo,
        message: 'Registration successful. Your Tembo wallet is ready.',
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
