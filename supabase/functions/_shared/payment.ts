// Unified payment provider - Snippe and Tembo
import { createSnippeCharge } from './snippe.ts'
import { createTemboCollection } from './tembo.ts'

export type PaymentProvider = 'snippe' | 'tembo'

export interface InitiatePaymentResult {
  chargeId: string | null
  provider: PaymentProvider
  error?: string
}

/**
 * Initiate STK push - tries Snippe first, then Tembo if Snippe fails or is not configured.
 */
export async function initiatePayment(
  amount: number,
  phone: string,
  currency: string,
  transactionRef: string,
  walletProvider?: string
): Promise<InitiatePaymentResult> {
  const preferred = (Deno.env.get('PAYMENT_PROVIDER') || 'snippe').toLowerCase()

  if (preferred === 'tembo') {
    const result = await createTemboCollection(amount, phone, transactionRef, walletProvider)
    if (result.chargeId) return { chargeId: result.chargeId, provider: 'tembo' }
    // Fallback to Snippe (e.g. M-Pesa not supported by Tembo)
    const snippeResult = await createSnippeCharge(amount, phone, currency)
    if (snippeResult.chargeId) return { chargeId: snippeResult.chargeId, provider: 'snippe' }
    return { chargeId: null, provider: 'tembo', error: result.error || snippeResult.error }
  }

  // Default: try Snippe first
  const snippeResult = await createSnippeCharge(amount, phone, currency)
  if (snippeResult.chargeId) return { chargeId: snippeResult.chargeId, provider: 'snippe' }
  const temboResult = await createTemboCollection(amount, phone, transactionRef, walletProvider)
  if (temboResult.chargeId) return { chargeId: temboResult.chargeId, provider: 'tembo' }
  return { chargeId: null, provider: 'snippe', error: snippeResult.error || temboResult.error }
}
