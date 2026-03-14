// Tembo API client for STK/USSD collection
// Docs: https://tembo.gitbook.io/tembo/reference/mobile-money-collection/initiate-momo-collection

// Map wallet provider to Tembo channel (Tanzania MNO prefixes)
// Tembo: Airtel, Tigo/Mixx, Halotel. M-Pesa (Vodacom) not supported - use Snippe.
const PROVIDER_TO_CHANNEL: Record<string, string> = {
  airtel: 'TZ-AIRTEL-C2B',
  tigo: 'TZ-TIGO-C2B',
  mixx: 'TZ-TIGO-C2B',
  halopesa: 'TZ-HALOTEL-C2B',
  halotel: 'TZ-HALOTEL-C2B',
}

function inferChannel(phone: string, provider?: string): string {
  const p = (provider || '').toLowerCase()
  if (PROVIDER_TO_CHANNEL[p]) return PROVIDER_TO_CHANNEL[p]
  // Infer from phone prefix (Tanzania: 078/068 Airtel, 071/065 Tigo, 062 Halotel)
  const digits = phone.replace(/\D/g, '').replace(/^255/, '')
  if (digits.startsWith('78') || digits.startsWith('68')) return 'TZ-AIRTEL-C2B'
  if (digits.startsWith('71') || digits.startsWith('65')) return 'TZ-TIGO-C2B'
  if (digits.startsWith('62')) return 'TZ-HALOTEL-C2B'
  return 'TZ-AIRTEL-C2B' // default
}

export async function createTemboCollection(
  amount: number,
  phone: string,
  transactionRef: string,
  provider?: string
): Promise<{ chargeId: string | null; error?: string }> {
  const accountId = Deno.env.get('TEMBO_ACCOUNT_ID')
  const secretKey = Deno.env.get('TEMBO_SECRET_KEY')
  const webhookBase = Deno.env.get('WEBHOOK_BASE_URL')
  const useSandbox = Deno.env.get('TEMBO_SANDBOX') === 'true'

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
  if (amountInt < 1000) {
    return { chargeId: null, error: 'Tembo minimum amount is 1,000 TZS' }
  }
  if (amountInt > 5_000_000) {
    return { chargeId: null, error: 'Tembo maximum amount is 5,000,000 TZS' }
  }

  const baseUrl = useSandbox
    ? 'https://sandbox.temboplus.com/tembo/v1'
    : 'https://api.temboplus.com/tembo/v1'

  try {
    const res = await fetch(`${baseUrl}/collection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-account-id': accountId,
        'x-secret-key': secretKey,
        'x-request-id': crypto.randomUUID(),
      },
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
