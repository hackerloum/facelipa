import { fetchWithAuth } from '../lib/supabase'
import { getFaceEmbeddingFromFile } from '../lib/face'

const STORAGE_KEY_ID = 'facelipa_merchant_id'
const STORAGE_KEY_API = 'facelipa_merchant_api_key'

function getMerchantCreds(): { id: string; apiKey: string } | null {
  const id = sessionStorage.getItem(STORAGE_KEY_ID)
  const apiKey = sessionStorage.getItem(STORAGE_KEY_API)
  if (!id || !apiKey) return null
  return { id, apiKey }
}

function setMerchantCreds(id: string, apiKey: string): void {
  sessionStorage.setItem(STORAGE_KEY_ID, id)
  sessionStorage.setItem(STORAGE_KEY_API, apiKey)
}

function clearMerchantCreds(): void {
  sessionStorage.removeItem(STORAGE_KEY_ID)
  sessionStorage.removeItem(STORAGE_KEY_API)
}

function showLoginView(): void {
  document.getElementById('login-view')!.classList.remove('hidden')
  document.getElementById('charge-view')!.classList.add('hidden')
}

function showChargeView(): void {
  document.getElementById('login-view')!.classList.add('hidden')
  document.getElementById('charge-view')!.classList.remove('hidden')
}

document.getElementById('btn-login')!.addEventListener('click', () => {
  const id = (document.getElementById('merchant-id') as HTMLInputElement).value.trim()
  const apiKey = (document.getElementById('merchant-api-key') as HTMLInputElement).value.trim()
  if (!id || !apiKey) {
    ;(document.getElementById('login-error') as HTMLElement).textContent = 'Enter Merchant ID and API Key'
    return
  }
  setMerchantCreds(id, apiKey)
  showChargeView()
  ;(document.getElementById('login-error') as HTMLElement).textContent = ''
})

let chargeFile: File | null = null
document.getElementById('charge-file')!.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  chargeFile = file
  const preview = document.getElementById('charge-preview')!
  preview.innerHTML = ''
  const img = document.createElement('img')
  img.src = URL.createObjectURL(file)
  img.alt = 'Preview'
  preview.appendChild(img)
  ;(document.getElementById('btn-charge') as HTMLButtonElement).disabled = false
})

document.getElementById('btn-charge')!.addEventListener('click', async () => {
  if (!chargeFile) return
  const creds = getMerchantCreds()
  if (!creds) {
    showLoginView()
    return
  }

  const amount = Number((document.getElementById('charge-amount') as HTMLInputElement).value)
  const currency = (document.getElementById('charge-currency') as HTMLSelectElement).value
  const reference = (document.getElementById('charge-reference') as HTMLInputElement).value.trim()

  if (isNaN(amount) || amount <= 0) {
    alert('Enter a valid amount')
    return
  }

  const resultEl = document.getElementById('charge-result')!
  resultEl.innerHTML = 'Extracting face...'
  try {
    const embedding = await getFaceEmbeddingFromFile(chargeFile)
    if (!embedding) {
      resultEl.innerHTML = '<span class="error">No face detected in photo.</span>'
      return
    }
    resultEl.innerHTML = 'Processing charge...'
    const res = await fetchWithAuth('/charge-by-face', {
      method: 'POST',
      merchantId: creds.id,
      merchantApiKey: creds.apiKey,
      body: JSON.stringify({
        embedding,
        amount,
        currency,
        reference: reference || undefined,
      }),
    })
    const data = await res.json()
    if (res.status === 401) {
      clearMerchantCreds()
      showLoginView()
      return
    }
    if (data.error) {
      resultEl.innerHTML = `<span class="error">${data.error}</span>`
      return
    }
    resultEl.innerHTML = `
      <div class="success">
        <p>Transaction: ${data.id}</p>
        <p>Status: ${data.status}</p>
        <p>${data.message || 'Customer is entering PIN on their phone.'}</p>
      </div>
    `
  } catch (e) {
    resultEl.innerHTML = `<span class="error">${(e as Error).message}</span>`
  }
})

document.getElementById('btn-logout')!.addEventListener('click', () => {
  clearMerchantCreds()
  showLoginView()
})

if (getMerchantCreds()) {
  showChargeView()
} else {
  showLoginView()
}
