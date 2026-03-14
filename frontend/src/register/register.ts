import './register.css'
import { el } from '../lib/dom'
import { fetchApi } from '../lib/supabase'
import { getFaceEmbeddingFromFile } from '../lib/face'

const STORAGE_KEY = 'facelipa_user_id'

function setUserId(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
}

function addField(
  form: HTMLElement,
  id: string,
  label: string,
  type: string,
  placeholder: string,
  required: boolean,
  options?: [string, string][]
): void {
  form.appendChild(el('label', { htmlFor: id }, label + (required ? ' *' : '')))
  if (options) {
    const select = el('select', { id })
    options.forEach(([v, t]) => select.appendChild(el('option', { value: v }, t)))
    form.appendChild(select)
  } else {
    form.appendChild(el('input', {
      id,
      type,
      placeholder,
      ...(required && { required: true }),
    }) as HTMLInputElement)
  }
}

export function renderRegister(onNavigate: (path: string) => void): HTMLElement {
  const root = el('div', { className: 'register-page' })

  const header = el('header', { className: 'register-header' })
  header.appendChild(el('h1', { className: 'register-title' }, 'Create your Tembo account'))
  header.appendChild(el('p', { className: 'register-subtitle' }, 'Register with Tembo. Pay with your face everywhere.'))
  root.appendChild(header)

  const card = el('div', { className: 'register-card' })
  const form = el('form', { className: 'register-form' })

  form.appendChild(el('h3', { className: 'register-section-title' }, 'Personal information'))
  addField(form, 'first-name', 'First name', 'text', 'John', true)
  addField(form, 'last-name', 'Last name', 'text', 'Doe', true)
  addField(form, 'phone', 'Phone number', 'tel', '255712345678', true)
  addField(form, 'email', 'Email', 'email', 'john@example.com', true)
  addField(form, 'date-of-birth', 'Date of birth', 'date', '', true)
  addField(form, 'gender', 'Gender', 'text', '', true, [['', 'Select'], ['M', 'Male'], ['F', 'Female']])

  form.appendChild(el('h3', { className: 'register-section-title' }, 'ID details'))
  addField(form, 'id-type', 'ID type', 'text', '', true, [
    ['NATIONAL_ID', 'National ID'],
    ['DRIVER_LICENSE', 'Driver License'],
    ['VOTER_ID', 'Voter ID'],
    ['INTL_PASSPORT', 'Passport'],
  ])
  addField(form, 'id-number', 'ID number', 'text', 'e.g. 19901234-12345-12345-12', true)
  addField(form, 'id-issue-date', 'ID issue date', 'date', '', true)
  addField(form, 'id-expiry-date', 'ID expiry date', 'date', '', true)

  form.appendChild(el('h3', { className: 'register-section-title' }, 'Address'))
  addField(form, 'street', 'Street address', 'text', '123 Main St', true)
  addField(form, 'city', 'City', 'text', 'Dar es Salaam', true)
  addField(form, 'postal-code', 'Postal code', 'text', '11101', true)

  form.appendChild(el('h3', { className: 'register-section-title' }, 'Face verification'))
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
  link.onclick = (e) => { e.preventDefault(); onNavigate('/bank') }
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
    const get = (id: string) => (root.querySelector(`#${id}`) as HTMLInputElement | HTMLSelectElement)?.value?.trim()
    const firstName = get('first-name')
    const lastName = get('last-name')
    const phone = get('phone')
    const email = get('email')
    const dateOfBirth = get('date-of-birth')
    const gender = get('gender')
    const idType = get('id-type')
    const idNumber = get('id-number')
    const idIssueDate = get('id-issue-date')
    const idExpiryDate = get('id-expiry-date')
    const street = get('street')
    const city = get('city')
    const postalCode = get('postal-code')

    statusEl.textContent = ''
    const required: [string, string][] = [
      ['first-name', 'First name'], ['last-name', 'Last name'], ['phone', 'Phone number'], ['email', 'Email'],
      ['date-of-birth', 'Date of birth'], ['gender', 'Gender'], ['id-type', 'ID type'], ['id-number', 'ID number'],
      ['id-issue-date', 'ID issue date'], ['id-expiry-date', 'ID expiry date'], ['street', 'Street address'],
      ['city', 'City'], ['postal-code', 'Postal code'],
    ]
    for (const [id, label] of required) {
      if (!get(id)) { statusEl.textContent = `${label} is required`; statusEl.className = 'register-status error'; return }
    }
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

    statusEl.textContent = 'Creating Tembo wallet...'

    const res = await fetchApi('/register-customer-tembo', {
      method: 'POST',
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        email,
        date_of_birth: dateOfBirth,
        gender,
        id_type: idType,
        id_number: idNumber,
        id_issue_date: idIssueDate,
        id_expiry_date: idExpiryDate,
        street,
        city,
        postal_code: postalCode,
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
