import './merchant.css'
import { el } from '../lib/dom'
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

export function renderMerchant(): HTMLElement {
  const root = el('div', { className: 'merchant-app' })

  const header = el('header', { className: 'header' })
  header.appendChild(el('h1', {}, 'FaceLipa Merchant'))
  header.appendChild(el('p', { className: 'subtitle' }, 'Charge by Face'))
  root.appendChild(header)

  const loginView = el('div', { id: 'login-view', className: 'view' })
  const loginCard = el('div', { className: 'login-card' })
  loginCard.appendChild(el('h2', {}, 'Merchant Login'))
  loginCard.appendChild(el('label', { htmlFor: 'merchant-id' }, 'Merchant ID'))
  loginCard.appendChild(el('input', { id: 'merchant-id', type: 'text', placeholder: 'UUID' }) as HTMLInputElement)
  loginCard.appendChild(el('label', { htmlFor: 'merchant-api-key' }, 'API Key'))
  loginCard.appendChild(el('input', { id: 'merchant-api-key', type: 'password', placeholder: 'API Key' }) as HTMLInputElement)
  loginCard.appendChild(el('button', { id: 'btn-login', className: 'btn btn-primary' }, 'Login'))
  loginCard.appendChild(el('p', { id: 'login-error', className: 'error' }))
  loginView.appendChild(loginCard)
  root.appendChild(loginView)

  const chargeView = el('div', { id: 'charge-view', className: 'view hidden' })
  const chargeForm = el('div', { className: 'charge-form' })
  chargeForm.appendChild(el('h2', {}, 'Charge Customer'))
  chargeForm.appendChild(el('p', { className: 'hint' }, "Capture customer's face photo, enter amount, and initiate payment."))
  chargeForm.appendChild(el('input', { id: 'charge-file', type: 'file', accept: 'image/*' }) as HTMLInputElement)
  chargeForm.appendChild(el('div', { id: 'charge-preview', className: 'preview-area' }))
  chargeForm.appendChild(el('label', { htmlFor: 'charge-amount' }, 'Amount'))
  chargeForm.appendChild(el('input', { id: 'charge-amount', type: 'number', placeholder: 'Amount', min: '1' }) as HTMLInputElement)
  chargeForm.appendChild(el('label', { htmlFor: 'charge-currency' }, 'Currency'))
  const currencySelect = el('select', { id: 'charge-currency' })
  currencySelect.appendChild(el('option', { value: 'TZS' }, 'TZS'))
  chargeForm.appendChild(currencySelect)
  chargeForm.appendChild(el('label', { htmlFor: 'charge-reference' }, 'Reference (optional)'))
  chargeForm.appendChild(el('input', { id: 'charge-reference', type: 'text', placeholder: 'Order #123' }) as HTMLInputElement)
  chargeForm.appendChild(el('button', { id: 'btn-charge', className: 'btn btn-primary', disabled: true }, 'Charge'))
  chargeView.appendChild(chargeForm)
  chargeView.appendChild(el('div', { id: 'charge-result', className: 'result-card' }))
  chargeView.appendChild(el('button', { id: 'btn-logout', className: 'btn btn-outline' }, 'Logout'))
  root.appendChild(chargeView)

  function showLoginView(): void {
    loginView.classList.remove('hidden')
    chargeView.classList.add('hidden')
  }
  function showChargeView(): void {
    loginView.classList.add('hidden')
    chargeView.classList.remove('hidden')
  }

  root.querySelector('#btn-login')!.addEventListener('click', () => {
    const id = (root.querySelector('#merchant-id') as HTMLInputElement).value.trim()
    const apiKey = (root.querySelector('#merchant-api-key') as HTMLInputElement).value.trim()
    if (!id || !apiKey) {
      ;(root.querySelector('#login-error') as HTMLElement).textContent = 'Enter Merchant ID and API Key'
      return
    }
    setMerchantCreds(id, apiKey)
    showChargeView()
    ;(root.querySelector('#login-error') as HTMLElement).textContent = ''
  })

  let chargeFile: File | null = null
  root.querySelector('#charge-file')!.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    chargeFile = file
    const preview = root.querySelector('#charge-preview')!
    preview.innerHTML = ''
    const img = document.createElement('img')
    img.src = URL.createObjectURL(file)
    img.alt = 'Preview'
    preview.appendChild(img)
    ;(root.querySelector('#btn-charge') as HTMLButtonElement).disabled = false
  })

  root.querySelector('#btn-charge')!.addEventListener('click', async () => {
    if (!chargeFile) return
    const creds = getMerchantCreds()
    if (!creds) { showLoginView(); return }
    const amount = Number((root.querySelector('#charge-amount') as HTMLInputElement).value)
    const currency = (root.querySelector('#charge-currency') as HTMLSelectElement).value
    const reference = (root.querySelector('#charge-reference') as HTMLInputElement).value.trim()
    if (isNaN(amount) || amount <= 0) { alert('Enter a valid amount'); return }
    const resultEl = root.querySelector('#charge-result') as HTMLElement
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
        body: JSON.stringify({ embedding, amount, currency, reference: reference || undefined }),
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
      resultEl.innerHTML = `<div class="success"><p>Transaction: ${data.id}</p><p>Status: ${data.status}</p><p>${data.message || 'Customer is entering PIN on their phone.'}</p></div>`
    } catch (e) {
      resultEl.innerHTML = `<span class="error">${(e as Error).message}</span>`
    }
  })

  root.querySelector('#btn-logout')!.addEventListener('click', () => {
    clearMerchantCreds()
    showLoginView()
  })

  if (getMerchantCreds()) {
    showChargeView()
  } else {
    showLoginView()
  }

  return root
}
