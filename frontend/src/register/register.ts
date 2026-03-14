import './register.css'
import { el } from '../lib/dom'
import { fetchApi } from '../lib/supabase'
import { getFaceEmbeddingFromFile } from '../lib/face'

const STORAGE_KEY = 'facelipa_user_id'

function setUserId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
}

export function renderRegister(onNavigate: (path: string) => void): HTMLElement {
  const root = el('div', { className: 'register-page' })

  const header = el('header', { className: 'register-header' })
  header.appendChild(el('h1', { className: 'register-title' }, 'Create your account'))
  header.appendChild(el('p', { className: 'register-subtitle' }, 'Register once. Pay with your face everywhere.'))
  root.appendChild(header)

  const card = el('div', { className: 'register-card' })
  const form = el('form', { className: 'register-form' })

  const fields = [
    { id: 'first-name', label: 'First name', type: 'text', placeholder: 'John', required: true },
    { id: 'last-name', label: 'Last name', type: 'text', placeholder: 'Doe', required: true },
    { id: 'phone', label: 'Phone number', type: 'tel', placeholder: '255712345678', required: true },
    { id: 'email', label: 'Email (optional)', type: 'email', placeholder: 'john@example.com', required: false },
  ]

  fields.forEach((f) => {
    form.appendChild(el('label', { htmlFor: f.id }, f.label + (f.required ? ' *' : '')))
    form.appendChild(el('input', {
      id: f.id,
      type: f.type,
      placeholder: f.placeholder,
      ...(f.required && { required: true }),
    }) as HTMLInputElement)
  })

  form.appendChild(el('label', { htmlFor: 'wallet-provider' }, 'Mobile money provider *'))
  const providerSelect = el('select', { id: 'wallet-provider' })
  ;['mpesa', 'airtel', 'halopesa', 'mixx'].forEach((p) => {
    providerSelect.appendChild(
      el('option', { value: p }, p === 'mpesa' ? 'M-Pesa' : p.charAt(0).toUpperCase() + p.slice(1))
    )
  })
  form.appendChild(providerSelect)

  form.appendChild(el('label', { htmlFor: 'wallet-phone' }, 'Wallet phone number *'))
  form.appendChild(el('input', {
    id: 'wallet-phone',
    type: 'tel',
    placeholder: '255712345678 (same as above for M-Pesa)',
  }) as HTMLInputElement)

  form.appendChild(el('label', { htmlFor: 'face-photo' }, 'Face photo *'))
  form.appendChild(el('p', { className: 'register-hint' }, 'Upload a clear photo of your face. Look straight at the camera.'))
  form.appendChild(el('input', { id: 'face-photo', type: 'file', accept: 'image/*' }) as HTMLInputElement)
  form.appendChild(el('div', { id: 'face-preview', className: 'register-preview' }))

  const statusEl = el('p', { id: 'register-status', className: 'register-status' })
  form.appendChild(statusEl)

  form.appendChild(el('button', { id: 'btn-submit', type: 'button', className: 'register-btn', disabled: true }, 'Complete Registration'))

  form.addEventListener('submit', (e) => e.preventDefault())

  card.appendChild(form)
  root.appendChild(card)

  const signInLink = el('p', { className: 'register-signin' })
  signInLink.appendChild(document.createTextNode('Already have an account? '))
  const link = el('a', { href: '/bank' }, 'Sign in')
  link.onclick = (e) => {
    e.preventDefault()
    onNavigate('/bank')
  }
  signInLink.appendChild(link)
  root.appendChild(signInLink)

  let faceFile: File | null = null
  root.querySelector('#face-photo')!.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    faceFile = file
    const preview = root.querySelector('#face-preview')!
    preview.innerHTML = ''
    const img = document.createElement('img')
    img.src = URL.createObjectURL(file)
    img.alt = 'Face preview'
    preview.appendChild(img)
    ;(root.querySelector('#btn-submit') as HTMLButtonElement).disabled = false
  })

  root.querySelector('#btn-submit')!.addEventListener('click', async () => {
    const firstName = (root.querySelector('#first-name') as HTMLInputElement).value.trim()
    const lastName = (root.querySelector('#last-name') as HTMLInputElement).value.trim()
    const phone = (root.querySelector('#phone') as HTMLInputElement).value.trim()
    const email = (root.querySelector('#email') as HTMLInputElement).value.trim()
    const walletProvider = (root.querySelector('#wallet-provider') as HTMLSelectElement).value
    const walletPhone = (root.querySelector('#wallet-phone') as HTMLInputElement).value.trim() || phone

    statusEl.textContent = ''
    if (!firstName) { statusEl.textContent = 'First name is required'; statusEl.className = 'register-status error'; return }
    if (!lastName) { statusEl.textContent = 'Last name is required'; statusEl.className = 'register-status error'; return }
    if (!phone) { statusEl.textContent = 'Phone number is required'; statusEl.className = 'register-status error'; return }
    if (!walletProvider) { statusEl.textContent = 'Select a wallet provider'; statusEl.className = 'register-status error'; return }
    if (!walletPhone) { statusEl.textContent = 'Wallet phone number is required'; statusEl.className = 'register-status error'; return }
    if (!faceFile) { statusEl.textContent = 'Upload your face photo'; statusEl.className = 'register-status error'; return }

    statusEl.className = 'register-status'
    statusEl.textContent = 'Extracting face...'

    let embedding: number[] | null = null
    try {
      embedding = await getFaceEmbeddingFromFile(faceFile)
    } catch (e) {
      statusEl.textContent = `Error: ${(e as Error).message}`
      statusEl.className = 'register-status error'
      return
    }
    if (!embedding) {
      statusEl.textContent = 'No face detected. Use a clearer photo looking straight at the camera.'
      statusEl.className = 'register-status error'
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

    const data = await res.json()

    if (data.error) {
      statusEl.textContent = data.error
      statusEl.className = 'register-status error'
      return
    }

    setUserId(data.user_id)
    statusEl.textContent = 'Registration successful! Redirecting...'
    statusEl.className = 'register-status success'

    setTimeout(() => onNavigate('/bank'), 1500)
  })

  return root
}
