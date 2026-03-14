// Tembo API - Banking & Wallets, Collect Money
// Docs: https://tembo.gitbook.io/tembo/
// Auth: x-account-id + x-secret-key (Collect Money, Create Wallet)
// Merchant Virtual Accounts use Bearer token (different API)

const PROVIDER_TO_CHANNEL: Record<string, string> = {
  airtel: 'TZ-AIRTEL-C2B',
  tigo: 'TZ-TIGO-C2B',
  mixx: 'TZ-TIGO-C2B',
  halopesa: 'TZ-HALOTEL-C2B',
  halotel: 'TZ-HALOTEL-C2B',
}

function getBaseUrl(): string {
  return Deno.env.get('TEMBO_SANDBOX') === 'true'
    ? 'https://sandbox.temboplus.com/tembo/v1'
    : 'https://api.temboplus.com/tembo/v1'
}

function getHeaders(): Record<string, string> {
  const accountId = Deno.env.get('TEMBO_ACCOUNT_ID')
  const secretKey = Deno.env.get('TEMBO_SECRET_KEY')
  if (!accountId || !secretKey) {
    throw new Error('TEMBO_ACCOUNT_ID and TEMBO_SECRET_KEY required')
  }
  return {
    'Content-Type': 'application/json',
    'x-account-id': accountId,
    'x-secret-key': secretKey,
    'x-request-id': crypto.randomUUID(),
  }
}

function inferChannel(phone: string, provider?: string): string {
  const p = (provider || '').toLowerCase()
  if (PROVIDER_TO_CHANNEL[p]) return PROVIDER_TO_CHANNEL[p]
  const digits = phone.replace(/\D/g, '').replace(/^255/, '')
  if (digits.startsWith('78') || digits.startsWith('68')) return 'TZ-AIRTEL-C2B'
  if (digits.startsWith('71') || digits.startsWith('65')) return 'TZ-TIGO-C2B'
  if (digits.startsWith('62')) return 'TZ-HALOTEL-C2B'
  return 'TZ-AIRTEL-C2B'
}

/** MOMO Collection - STK push to collect from mobile money */
export async function createTemboCollection(
  amount: number,
  phone: string,
  transactionRef: string,
  provider?: string
): Promise<{ chargeId: string | null; error?: string }> {
  const webhookBase = Deno.env.get('WEBHOOK_BASE_URL')
  const accountId = Deno.env.get('TEMBO_ACCOUNT_ID')
  const secretKey = Deno.env.get('TEMBO_SECRET_KEY')
  if (!accountId || !secretKey) {
    return { chargeId: null, error: 'TEMBO_ACCOUNT_ID and TEMBO_SECRET_KEY not configured' }
  }

  const normalizedPhone = phone.replace(/\D/g, '').replace(/^0/, '255')
  if (normalizedPhone.length < 9) {
    return { chargeId: null, error: 'Invalid phone number' }
  }
  const msisdn = normalizedPhone.startsWith('255') ? normalizedPhone : `255${normalizedPhone}`

  const channel = inferChannel(msisdn, provider)
  const amountInt = Math.round(amount)
  if (amountInt < 1000) return { chargeId: null, error: 'Tembo minimum amount is 1,000 TZS' }
  if (amountInt > 5_000_000) return { chargeId: null, error: 'Tembo maximum amount is 5,000,000 TZS' }

  try {
    const res = await fetch(`${getBaseUrl()}/collection`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        channel,
        msisdn,
        amount: amountInt,
        transactionRef,
        narration: `FaceLipa payment ${transactionRef}`,
        transactionDate: new Date().toISOString(),
        callbackUrl: webhookBase ? `${webhookBase}/tembo-webhook` : undefined,
      }),
    })

    const data = await res.json().catch(() => ({}))
    const transactionId = data?.transactionId ?? data?.transactionRef

    if (!res.ok) {
      const msg = data?.message ?? data?.reason ?? `HTTP ${res.status}`
      return { chargeId: null, error: msg }
    }

    return { chargeId: transactionId ? String(transactionId) : null }
  } catch (err) {
    return { chargeId: null, error: String(err) }
  }
}

/** Create Tembo wallet (bank account) for customer - requires full KYC */
export interface CreateWalletParams {
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'M' | 'F'
  idType: 'NATIONAL_ID' | 'DRIVER_LICENSE' | 'VOTER_ID' | 'INTL_PASSPORT'
  idNumber: string
  idIssueDate: string
  idExpiryDate: string
  street: string
  city: string
  postalCode: string
  mobileNo: string
  email: string
  currencyCode?: string
  externalCustomerRef?: string
  middleName?: string
}

export async function createTemboWallet(params: CreateWalletParams): Promise<{ accountNo: string | null; error?: string }> {
  const accountId = Deno.env.get('TEMBO_ACCOUNT_ID')
  const secretKey = Deno.env.get('TEMBO_SECRET_KEY')
  if (!accountId || !secretKey) {
    return { accountNo: null, error: 'TEMBO_ACCOUNT_ID and TEMBO_SECRET_KEY not configured' }
  }

  try {
    const res = await fetch(`${getBaseUrl()}/wallet`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        firstName: params.firstName,
        middleName: params.middleName || '',
        lastName: params.lastName,
        dateOfBirth: params.dateOfBirth,
        gender: params.gender,
        identityInfo: {
          idType: params.idType,
          idNumber: params.idNumber,
          issueDate: params.idIssueDate,
          expiryDate: params.idExpiryDate,
        },
        address: {
          street: params.street,
          city: params.city,
          postalCode: params.postalCode,
        },
        mobileNo: params.mobileNo.replace(/\D/g, '').replace(/^0/, '255').replace(/^(\d{9})$/, '255$1'),
        email: params.email,
        currencyCode: params.currencyCode || 'TZS',
        externalCustomerRef: params.externalCustomerRef,
      }),
    })

    const data = await res.json().catch(() => ({}))
    const accountNo = data?.accountNo ?? data?.data?.accountNo

    if (!res.ok) {
      const msg = data?.message ?? data?.reason ?? data?.error ?? `HTTP ${res.status}`
      return { accountNo: null, error: msg }
    }

    return { accountNo: accountNo ? String(accountNo) : null }
  } catch (err) {
    return { accountNo: null, error: String(err) }
  }
}
