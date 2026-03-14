// Snippe API client for STK/USSD push
// Docs: https://docs.snippe.sh/docs/2026-01-25/payments/mobile-money

export async function createSnippeCharge(
  amount: number,
  phone: string,
  currency = 'TZS'
): Promise<{ chargeId: string | null; error?: string }> {
  const apiKey = Deno.env.get('SNIPPE_API_KEY')
  const webhookBase = Deno.env.get('WEBHOOK_BASE_URL')

  if (!apiKey) {
    return { chargeId: null, error: 'SNIPPE_API_KEY not configured' }
  }

  const normalizedPhone = phone.replace(/\D/g, '').replace(/^0/, '255')
  if (normalizedPhone.length < 9) {
    return { chargeId: null, error: 'Invalid phone number' }
  }
  const fullPhone = normalizedPhone.startsWith('255') ? normalizedPhone : `255${normalizedPhone}`

  try {
    const res = await fetch('https://api.snippe.sh/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `facelipa-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({
        payment_type: 'mobile',
        details: {
          amount: Math.round(amount),
          currency,
        },
        phone_number: fullPhone,
        customer: {
          firstname: 'Customer',
          lastname: 'FaceLipa',
          email: 'customer@facelipa.local',
        },
        webhook_url: webhookBase ? `${webhookBase}/snippe-webhook` : undefined,
      }),
    })

    const data = await res.json().catch(() => ({}))
    const ref = data?.data?.reference ?? data?.reference ?? data?.id

    if (!res.ok) {
      return { chargeId: null, error: data?.message ?? data?.error ?? `HTTP ${res.status}` }
    }

    return { chargeId: ref ? String(ref) : null }
  } catch (err) {
    return { chargeId: null, error: String(err) }
  }
}
