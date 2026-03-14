import './bank.css'
import { el } from '../lib/dom'
import { supabase, fetchWithAuth, fetchApi } from '../lib/supabase'
import { getFaceEmbeddingFromFile } from '../lib/face'

const STORAGE_KEY = 'facelipa_user_id'

function getUserId(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

function setUserId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
}

function clearUserId(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function renderBank(): HTMLElement {
  const root = el('div', { className: 'bank-app' })

  const header = el('header', { className: 'header' })
  header.appendChild(el('h1', {}, 'FaceLipa'))
  header.appendChild(el('p', { className: 'subtitle' }, 'Biometric Mobile Money'))
  root.appendChild(header)

  const authView = el('div', { id: 'auth-view', className: 'view' })
  const authCard = el('div', { className: 'auth-card' })

  authCard.appendChild(el('h2', {}, 'Register as Customer'))

  const regForm = el('div', { className: 'reg-form' })
  regForm.appendChild(el('label', { htmlFor: 'reg-first-name' }, 'First name *'))
  regForm.appendChild(el('input', { id: 'reg-first-name', type: 'text', placeholder: 'John' }) as HTMLInputElement)
  regForm.appendChild(el('label', { htmlFor: 'reg-last-name' }, 'Last name *'))
  regForm.appendChild(el('input', { id: 'reg-last-name', type: 'text', placeholder: 'Doe' }) as HTMLInputElement)
  regForm.appendChild(el('label', { htmlFor: 'reg-phone' }, 'Phone number *'))
  regForm.appendChild(el('input', { id: 'reg-phone', type: 'tel', placeholder: '255712345678' }) as HTMLInputElement)
  regForm.appendChild(el('label', { htmlFor: 'reg-email' }, 'Email'))
  regForm.appendChild(el('input', { id: 'reg-email', type: 'email', placeholder: 'john@example.com' }) as HTMLInputElement)
  regForm.appendChild(el('label', { htmlFor: 'reg-wallet-provider' }, 'Mobile money provider *'))
  const providerSelect = el('select', { id: 'reg-wallet-provider' })
  ;['mpesa', 'airtel', 'halopesa', 'mixx'].forEach(p => {
    providerSelect.appendChild(el('option', { value: p }, p === 'mpesa' ? 'M-Pesa' : p.charAt(0).toUpperCase() + p.slice(1)))
  })
  regForm.appendChild(providerSelect)
  regForm.appendChild(el('label', { htmlFor: 'reg-wallet-phone' }, 'Wallet phone number *'))
  regForm.appendChild(el('input', { id: 'reg-wallet-phone', type: 'tel', placeholder: '255712345678 (same as above if M-Pesa)' }) as HTMLInputElement)
  regForm.appendChild(el('label', { htmlFor: 'reg-face' }, 'Face photo *'))
  regForm.appendChild(el('p', { className: 'hint' }, 'Upload a clear photo of your face. Look straight at the camera.'))
  regForm.appendChild(el('input', { id: 'reg-face', type: 'file', accept: 'image/*' }) as HTMLInputElement)
  regForm.appendChild(el('div', { id: 'reg-face-preview', className: 'preview-area' }))
  regForm.appendChild(el('p', { id: 'reg-status', className: 'status' }))
  regForm.appendChild(el('button', { id: 'btn-register', className: 'btn btn-primary', disabled: true }, 'Complete Registration'))
  authCard.appendChild(regForm)

  authCard.appendChild(el('p', { className: 'auth-divider' }, 'Already have an account?'))
  const signin = el('div', { className: 'auth-signin' })
  signin.appendChild(el('label', { htmlFor: 'input-user-id' }, 'Sign in with User ID'))
  signin.appendChild(el('input', { id: 'input-user-id', type: 'text', placeholder: 'Paste your UUID' }) as HTMLInputElement)
  signin.appendChild(el('button', { id: 'btn-sign-in', className: 'btn btn-secondary' }, 'Sign in'))
  authCard.appendChild(signin)
  authView.appendChild(authCard)
  root.appendChild(authView)

  const mainView = el('div', { id: 'main-view', className: 'view hidden' })
  const tabs = el('nav', { className: 'tabs' })
  const tabIds = ['account', 'enroll', 'wallets', 'pay', 'statement']
  tabIds.forEach((t, i) => {
    const btn = el('button', { className: `tab${i === 0 ? ' active' : ''}`, 'data-tab': t }, t.charAt(0).toUpperCase() + t.slice(1))
    tabs.appendChild(btn)
  })
  mainView.appendChild(tabs)

  const tabContent = el('main', { className: 'tab-content' })

  const accountPanel = el('section', { id: 'tab-account', className: 'tab-panel active' })
  accountPanel.appendChild(el('h2', {}, 'Account'))
  const balanceCard = el('div', { className: 'balance-card' })
  balanceCard.appendChild(el('span', { className: 'balance-label' }, 'Balance'))
  balanceCard.appendChild(el('span', { id: 'balance-value', className: 'balance-value' }, '0.00 TZS'))
  accountPanel.appendChild(balanceCard)
  const depositForm = el('div', { className: 'deposit-form' })
  depositForm.appendChild(el('label', { htmlFor: 'deposit-amount' }, 'Deposit (dev only)'))
  depositForm.appendChild(el('input', { id: 'deposit-amount', type: 'number', placeholder: 'Amount', min: '1' }) as HTMLInputElement)
  depositForm.appendChild(el('button', { id: 'btn-deposit', className: 'btn btn-primary' }, 'Deposit'))
  accountPanel.appendChild(depositForm)
  accountPanel.appendChild(el('button', { id: 'btn-refresh', className: 'btn btn-secondary' }, 'Refresh'))
  tabContent.appendChild(accountPanel)

  const enrollPanel = el('section', { id: 'tab-enroll', className: 'tab-panel' })
  enrollPanel.appendChild(el('h2', {}, 'Enroll Face'))
  enrollPanel.appendChild(el('p', { className: 'hint' }, "Update your face photo. We'll use it to verify your identity for payments."))
  enrollPanel.appendChild(el('input', { id: 'enroll-file', type: 'file', accept: 'image/*' }) as HTMLInputElement)
  enrollPanel.appendChild(el('div', { id: 'enroll-preview', className: 'preview-area' }))
  enrollPanel.appendChild(el('button', { id: 'btn-enroll', className: 'btn btn-primary', disabled: true }, 'Update Face'))
  enrollPanel.appendChild(el('p', { id: 'enroll-status', className: 'status' }))
  tabContent.appendChild(enrollPanel)

  const walletsPanel = el('section', { id: 'tab-wallets', className: 'tab-panel' })
  walletsPanel.appendChild(el('h2', {}, 'Wallets'))
  const walletForm = el('div', { className: 'wallet-form' })
  walletForm.appendChild(el('label', { htmlFor: 'wallet-provider' }, 'Provider'))
  const providerSelect2 = el('select', { id: 'wallet-provider' })
  ;['mpesa', 'airtel', 'halopesa', 'mixx'].forEach(p => {
    providerSelect2.appendChild(el('option', { value: p }, p === 'mpesa' ? 'M-Pesa' : p.charAt(0).toUpperCase() + p.slice(1)))
  })
  walletForm.appendChild(providerSelect2)
  walletForm.appendChild(el('label', { htmlFor: 'wallet-id' }, 'Phone / Wallet ID'))
  walletForm.appendChild(el('input', { id: 'wallet-id', type: 'text', placeholder: '255712345678' }) as HTMLInputElement)
  walletForm.appendChild(el('button', { id: 'btn-link-wallet', className: 'btn btn-primary' }, 'Link Wallet'))
  walletsPanel.appendChild(walletForm)
  walletsPanel.appendChild(el('ul', { id: 'wallet-list', className: 'wallet-list' }))
  tabContent.appendChild(walletsPanel)

  const payPanel = el('section', { id: 'tab-pay', className: 'tab-panel' })
  payPanel.appendChild(el('h2', {}, 'Pay'))
  payPanel.appendChild(el('p', { className: 'hint' }, 'Upload a selfie and enter amount to pay.'))
  payPanel.appendChild(el('input', { id: 'pay-file', type: 'file', accept: 'image/*' }) as HTMLInputElement)
  payPanel.appendChild(el('div', { id: 'pay-preview', className: 'preview-area' }))
  payPanel.appendChild(el('label', { htmlFor: 'pay-amount' }, 'Amount'))
  payPanel.appendChild(el('input', { id: 'pay-amount', type: 'number', placeholder: 'Amount', min: '1' }) as HTMLInputElement)
  payPanel.appendChild(el('label', { htmlFor: 'pay-currency' }, 'Currency'))
  const currencySelect = el('select', { id: 'pay-currency' })
  currencySelect.appendChild(el('option', { value: 'TZS' }, 'TZS'))
  payPanel.appendChild(currencySelect)
  payPanel.appendChild(el('button', { id: 'btn-pay', className: 'btn btn-primary', disabled: true }, 'Pay'))
  payPanel.appendChild(el('div', { id: 'pay-result', className: 'result-card' }))
  tabContent.appendChild(payPanel)

  const statementPanel = el('section', { id: 'tab-statement', className: 'tab-panel' })
  statementPanel.appendChild(el('h2', {}, 'Statement'))
  statementPanel.appendChild(el('button', { id: 'btn-load-statement', className: 'btn btn-secondary' }, 'Load Transactions'))
  statementPanel.appendChild(el('div', { id: 'statement-list', className: 'statement-list' }))
  tabContent.appendChild(statementPanel)

  mainView.appendChild(tabContent)
  mainView.appendChild(el('button', { id: 'btn-sign-out', className: 'btn btn-outline' }, 'Sign out'))
  root.appendChild(mainView)

  function showAuthView(): void {
    authView.classList.remove('hidden')
    mainView.classList.add('hidden')
  }
  function showMainView(): void {
    authView.classList.add('hidden')
    mainView.classList.remove('hidden')
  }
  function switchTab(tabId: string): void {
    root.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    root.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
    root.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active')
    root.querySelector(`#tab-${tabId}`)?.classList.add('active')
  }

  async function loadAccountSummary(): Promise<void> {
    const userId = getUserId()
    if (!userId) return
    const res = await fetchWithAuth('/account-summary', { method: 'GET', userId })
    if (res.status === 401) {
      clearUserId()
      showAuthView()
      return
    }
    const data = await res.json()
    if (data.error) return
    const balanceEl = root.querySelector('#balance-value')!
    balanceEl.textContent = `${Number(data.balance).toFixed(2)} TZS`
    const walletList = root.querySelector('#wallet-list')!
    walletList.innerHTML = ''
    for (const w of data.wallets || []) {
      const li = el('li', {}, `${w.provider} - ${w.provider_wallet_id} (${w.currency})`)
      walletList.appendChild(li)
    }
  }

  let regFaceFile: File | null = null
  root.querySelector('#reg-face')!.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    regFaceFile = file
    const preview = root.querySelector('#reg-face-preview')!
    preview.innerHTML = ''
    const img = document.createElement('img')
    img.src = URL.createObjectURL(file)
    img.alt = 'Preview'
    preview.appendChild(img)
    ;(root.querySelector('#btn-register') as HTMLButtonElement).disabled = false
  })

  root.querySelector('#btn-register')!.addEventListener('click', async () => {
    const firstName = (root.querySelector('#reg-first-name') as HTMLInputElement).value.trim()
    const lastName = (root.querySelector('#reg-last-name') as HTMLInputElement).value.trim()
    const phone = (root.querySelector('#reg-phone') as HTMLInputElement).value.trim()
    const email = (root.querySelector('#reg-email') as HTMLInputElement).value.trim()
    const walletProvider = (root.querySelector('#reg-wallet-provider') as HTMLSelectElement).value
    const walletPhone = (root.querySelector('#reg-wallet-phone') as HTMLInputElement).value.trim() || phone

    const statusEl = root.querySelector('#reg-status') as HTMLElement
    if (!firstName) { statusEl.textContent = 'First name is required'; return }
    if (!lastName) { statusEl.textContent = 'Last name is required'; return }
    if (!phone) { statusEl.textContent = 'Phone number is required'; return }
    if (!walletProvider) { statusEl.textContent = 'Select a wallet provider'; return }
    if (!walletPhone) { statusEl.textContent = 'Wallet phone number is required'; return }
    if (!regFaceFile) { statusEl.textContent = 'Upload your face photo'; return }

    statusEl.textContent = 'Extracting face...'
    let embedding: number[] | null = null
    try {
      embedding = await getFaceEmbeddingFromFile(regFaceFile)
    } catch (e) {
      const msg = (e as Error).message
      const isModelError = /JSON|position|parse|Unexpected/.test(msg)
      statusEl.textContent = isModelError
        ? 'Face models failed to load. Run: npm run download-models (local) or redeploy (Vercel).'
        : `Error: ${msg}`
      return
    }
    if (!embedding) {
      statusEl.textContent = 'No face detected. Use a clearer photo looking straight at the camera.'
      return
    }

    statusEl.textContent = 'Registering...'
    const res = await fetchApi('/register-customer', {
      method: 'POST',
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        email: email || undefined,
        wallet_provider: walletProvider,
        wallet_phone: walletPhone,
        embedding,
      }),
    })
    let data: { user_id?: string; error?: string }
    try {
      const text = await res.text()
      data = text ? JSON.parse(text) : {}
    } catch {
      statusEl.textContent = `API returned invalid response (status ${res.status}). Check Supabase URL and that Edge Functions are deployed.`
      return
    }
    if (data.error) {
      statusEl.textContent = data.error
      return
    }
    if (!data.user_id) {
      statusEl.textContent = 'Registration succeeded but no user ID returned.'
      return
    }
    setUserId(data.user_id)
    statusEl.textContent = ''
    showMainView()
    loadAccountSummary()
    alert('Registration successful! You can now pay with your face.')
  })

  root.querySelector('#btn-sign-in')!.addEventListener('click', () => {
    const id = (root.querySelector('#input-user-id') as HTMLInputElement).value.trim()
    if (!id) { alert('Enter your User ID'); return }
    setUserId(id)
    showMainView()
    loadAccountSummary()
  })
  root.querySelector('#btn-sign-out')!.addEventListener('click', () => {
    clearUserId()
    showAuthView()
  })
  root.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab((tab as HTMLElement).dataset.tab!))
  })
  root.querySelector('#btn-deposit')!.addEventListener('click', async () => {
    const userId = getUserId()
    if (!userId) return
    const amount = Number((root.querySelector('#deposit-amount') as HTMLInputElement).value)
    if (isNaN(amount) || amount <= 0) { alert('Enter a valid amount'); return }
    const res = await fetchWithAuth('/deposit', { method: 'POST', userId, body: JSON.stringify({ amount }) })
    const data = await res.json()
    if (data.error) { alert(data.error); return }
    loadAccountSummary()
    ;(root.querySelector('#deposit-amount') as HTMLInputElement).value = ''
  })
  root.querySelector('#btn-refresh')!.addEventListener('click', () => loadAccountSummary())

  let enrollFile: File | null = null
  root.querySelector('#enroll-file')!.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    enrollFile = file
    const preview = root.querySelector('#enroll-preview')!
    preview.innerHTML = ''
    const img = document.createElement('img')
    img.src = URL.createObjectURL(file)
    img.alt = 'Preview'
    preview.appendChild(img)
    ;(root.querySelector('#btn-enroll') as HTMLButtonElement).disabled = false
  })
  root.querySelector('#btn-enroll')!.addEventListener('click', async () => {
    if (!enrollFile) return
    const userId = getUserId()
    if (!userId) return
    const statusEl = root.querySelector('#enroll-status') as HTMLElement
    statusEl.textContent = 'Extracting face...'
    try {
      const embedding = await getFaceEmbeddingFromFile(enrollFile)
      if (!embedding) { statusEl.textContent = 'No face detected. Try a clearer photo.'; return }
      statusEl.textContent = 'Updating...'
      const res = await fetchWithAuth('/enroll-face', { method: 'POST', userId, body: JSON.stringify({ embedding }) })
      const data = await res.json()
      if (data.error) { statusEl.textContent = data.error; return }
      statusEl.textContent = 'Face updated successfully!'
    } catch (e) {
      statusEl.textContent = `Error: ${(e as Error).message}`
    }
  })

  root.querySelector('#btn-link-wallet')!.addEventListener('click', async () => {
    const userId = getUserId()
    if (!userId) return
    const provider = (root.querySelector('#wallet-provider') as HTMLSelectElement).value
    const walletId = (root.querySelector('#wallet-id') as HTMLInputElement).value.trim()
    if (!walletId) { alert('Enter phone or wallet ID'); return }
    let { data: profile } = await supabase.from('user_profiles').select('id').eq('external_user_id', userId).single()
    if (!profile) {
      const { data: newProfile, error: insertErr } = await supabase.from('user_profiles').insert({ external_user_id: userId, phone_number: 'pending' }).select('id').single()
      if (insertErr || !newProfile) { alert('Could not create profile'); return }
      profile = newProfile
    }
    const { error } = await supabase.from('wallets').insert({ user_id: profile.id, provider, provider_wallet_id: walletId, currency: 'TZS' })
    if (error) { alert(error.message); return }
    loadAccountSummary()
    ;(root.querySelector('#wallet-id') as HTMLInputElement).value = ''
  })

  let payFile: File | null = null
  root.querySelector('#pay-file')!.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    payFile = file
    const preview = root.querySelector('#pay-preview')!
    preview.innerHTML = ''
    const img = document.createElement('img')
    img.src = URL.createObjectURL(file)
    preview.appendChild(img)
    ;(root.querySelector('#btn-pay') as HTMLButtonElement).disabled = false
  })
  root.querySelector('#btn-pay')!.addEventListener('click', async () => {
    if (!payFile) return
    const userId = getUserId()
    if (!userId) return
    const amount = Number((root.querySelector('#pay-amount') as HTMLInputElement).value)
    const currency = (root.querySelector('#pay-currency') as HTMLSelectElement).value
    if (isNaN(amount) || amount <= 0) { alert('Enter a valid amount'); return }
    const resultEl = root.querySelector('#pay-result') as HTMLElement
    resultEl.innerHTML = 'Extracting face...'
    try {
      const embedding = await getFaceEmbeddingFromFile(payFile)
      if (!embedding) { resultEl.innerHTML = '<span class="error">No face detected.</span>'; return }
      resultEl.innerHTML = 'Processing payment...'
      const res = await fetchWithAuth('/facepay', { method: 'POST', userId, body: JSON.stringify({ embedding, amount, currency }) })
      const data = await res.json()
      if (data.error) { resultEl.innerHTML = `<span class="error">${data.error}</span>`; return }
      resultEl.innerHTML = `<div class="success"><p>Transaction: ${data.id}</p><p>Status: ${data.status}</p><p>${data.message || 'Enter PIN on your phone to complete.'}</p></div>`
      loadAccountSummary()
    } catch (e) {
      resultEl.innerHTML = `<span class="error">${(e as Error).message}</span>`
    }
  })

  root.querySelector('#btn-load-statement')!.addEventListener('click', async () => {
    const userId = getUserId()
    if (!userId) return
    const res = await fetchWithAuth('/account-summary', { method: 'GET', userId })
    const data = await res.json()
    const list = root.querySelector('#statement-list') as HTMLElement
    list.innerHTML = ''
    const txs = data.transactions || []
    if (txs.length === 0) { list.innerHTML = '<p>No transactions yet.</p>'; return }
    for (const t of txs) {
      const div = el('div', { className: 'statement-item' })
      div.innerHTML = `<span>${t.amount} ${t.currency}</span><span>${t.status}</span><span>${new Date(t.created_at).toLocaleString()}</span>`
      list.appendChild(div)
    }
  })

  if (getUserId()) {
    showMainView()
    loadAccountSummary()
  } else {
    showAuthView()
  }

  return root
}
