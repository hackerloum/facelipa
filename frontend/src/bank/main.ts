import { supabase, getFunctionsBase, fetchWithAuth } from '../lib/supabase'
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

function showAuthView(): void {
  document.getElementById('auth-view')!.classList.remove('hidden')
  document.getElementById('main-view')!.classList.add('hidden')
}

function showMainView(): void {
  document.getElementById('auth-view')!.classList.add('hidden')
  document.getElementById('main-view')!.classList.remove('hidden')
}

function switchTab(tabId: string): void {
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'))
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'))
  document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active')
  document.getElementById(`tab-${tabId}`)?.classList.add('active')
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
  if (data.error) {
    console.error(data.error)
    return
  }

  const balanceEl = document.getElementById('balance-value')!
  balanceEl.textContent = `${Number(data.balance).toFixed(2)} TZS`

  const walletList = document.getElementById('wallet-list')!
  walletList.innerHTML = ''
  for (const w of data.wallets || []) {
    const li = document.createElement('li')
    li.textContent = `${w.provider} - ${w.provider_wallet_id} (${w.currency})`
    walletList.appendChild(li)
  }
}

function initAuth(): void {
  const userId = getUserId()
  if (userId) {
    showMainView()
    loadAccountSummary()
    return
  }
  showAuthView()
}

document.getElementById('btn-open-account')!.addEventListener('click', () => {
  const id = crypto.randomUUID()
  setUserId(id)
  showMainView()
  loadAccountSummary()
  alert(`Account created! Your User ID: ${id}\nSave this to sign in later.`)
})

document.getElementById('btn-sign-in')!.addEventListener('click', () => {
  const input = document.getElementById('input-user-id') as HTMLInputElement
  const id = input.value.trim()
  if (!id) {
    alert('Enter your User ID')
    return
  }
  setUserId(id)
  showMainView()
  loadAccountSummary()
})

document.getElementById('btn-sign-out')!.addEventListener('click', () => {
  clearUserId()
  showAuthView()
})

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => switchTab((tab as HTMLElement).dataset.tab!))
})

document.getElementById('btn-deposit')!.addEventListener('click', async () => {
  const userId = getUserId()
  if (!userId) return
  const amount = Number((document.getElementById('deposit-amount') as HTMLInputElement).value)
  if (isNaN(amount) || amount <= 0) {
    alert('Enter a valid amount')
    return
  }
  const res = await fetchWithAuth('/deposit', {
    method: 'POST',
    userId,
    body: JSON.stringify({ amount }),
  })
  const data = await res.json()
  if (data.error) {
    alert(data.error)
    return
  }
  loadAccountSummary()
  ;(document.getElementById('deposit-amount') as HTMLInputElement).value = ''
})

document.getElementById('btn-refresh')!.addEventListener('click', () => loadAccountSummary())

// Enroll face
let enrollFile: File | null = null
document.getElementById('enroll-file')!.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  enrollFile = file
  const preview = document.getElementById('enroll-preview')!
  preview.innerHTML = ''
  const img = document.createElement('img')
  img.src = URL.createObjectURL(file)
  img.alt = 'Preview'
  preview.appendChild(img)
  ;(document.getElementById('btn-enroll') as HTMLButtonElement).disabled = false
})

document.getElementById('btn-enroll')!.addEventListener('click', async () => {
  if (!enrollFile) return
  const userId = getUserId()
  if (!userId) return

  const statusEl = document.getElementById('enroll-status')!
  statusEl.textContent = 'Extracting face...'
  try {
    const embedding = await getFaceEmbeddingFromFile(enrollFile)
    if (!embedding) {
      statusEl.textContent = 'No face detected. Try a clearer photo.'
      return
    }
    statusEl.textContent = 'Enrolling...'
    const res = await fetchWithAuth('/enroll-face', {
      method: 'POST',
      userId,
      body: JSON.stringify({ embedding }),
    })
    const data = await res.json()
    if (data.error) {
      statusEl.textContent = data.error
      return
    }
    statusEl.textContent = 'Face enrolled successfully!'
  } catch (e) {
    statusEl.textContent = `Error: ${(e as Error).message}`
  }
})

// Wallets - link via Supabase
document.getElementById('btn-link-wallet')!.addEventListener('click', async () => {
  const userId = getUserId()
  if (!userId) return

  const provider = (document.getElementById('wallet-provider') as HTMLSelectElement).value
  const walletId = (document.getElementById('wallet-id') as HTMLInputElement).value.trim()
  if (!walletId) {
    alert('Enter phone or wallet ID')
    return
  }

  let { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('external_user_id', userId)
    .single()

  if (!profile) {
    const { data: newProfile, error: insertErr } = await supabase
      .from('user_profiles')
      .insert({ external_user_id: userId, phone_number: 'pending' })
      .select('id')
      .single()
    if (insertErr || !newProfile) {
      alert('Could not create profile')
      return
    }
    profile = newProfile
  }

  const { error } = await supabase.from('wallets').insert({
    user_id: profile.id,
    provider,
    provider_wallet_id: walletId,
    currency: 'TZS',
  })
  if (error) {
    alert(error.message)
    return
  }
  loadAccountSummary()
  ;(document.getElementById('wallet-id') as HTMLInputElement).value = ''
})

// Pay
let payFile: File | null = null
document.getElementById('pay-file')!.addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  payFile = file
  const preview = document.getElementById('pay-preview')!
  preview.innerHTML = ''
  const img = document.createElement('img')
  img.src = URL.createObjectURL(file)
  preview.appendChild(img)
  ;(document.getElementById('btn-pay') as HTMLButtonElement).disabled = false
})

document.getElementById('btn-pay')!.addEventListener('click', async () => {
  if (!payFile) return
  const userId = getUserId()
  if (!userId) return

  const amount = Number((document.getElementById('pay-amount') as HTMLInputElement).value)
  const currency = (document.getElementById('pay-currency') as HTMLSelectElement).value
  if (isNaN(amount) || amount <= 0) {
    alert('Enter a valid amount')
    return
  }

  const resultEl = document.getElementById('pay-result')!
  resultEl.innerHTML = 'Extracting face...'
  try {
    const embedding = await getFaceEmbeddingFromFile(payFile)
    if (!embedding) {
      resultEl.innerHTML = '<span class="error">No face detected.</span>'
      return
    }
    resultEl.innerHTML = 'Processing payment...'
    const res = await fetchWithAuth('/facepay', {
      method: 'POST',
      userId,
      body: JSON.stringify({ embedding, amount, currency }),
    })
    const data = await res.json()
    if (data.error) {
      resultEl.innerHTML = `<span class="error">${data.error}</span>`
      return
    }
    resultEl.innerHTML = `
      <div class="success">
        <p>Transaction: ${data.id}</p>
        <p>Status: ${data.status}</p>
        <p>${data.message || 'Enter PIN on your phone to complete.'}</p>
      </div>
    `
    loadAccountSummary()
  } catch (e) {
    resultEl.innerHTML = `<span class="error">${(e as Error).message}</span>`
  }
})

// Statement
document.getElementById('btn-load-statement')!.addEventListener('click', async () => {
  const userId = getUserId()
  if (!userId) return

  const res = await fetchWithAuth('/account-summary', { method: 'GET', userId })
  const data = await res.json()
  const list = document.getElementById('statement-list')!
  list.innerHTML = ''
  const txs = data.transactions || []
  if (txs.length === 0) {
    list.innerHTML = '<p>No transactions yet.</p>'
    return
  }
  for (const t of txs) {
    const div = document.createElement('div')
    div.className = 'statement-item'
    div.innerHTML = `
      <span>${t.amount} ${t.currency}</span>
      <span>${t.status}</span>
      <span>${new Date(t.created_at).toLocaleString()}</span>
    `
    list.appendChild(div)
  }
})

initAuth()
