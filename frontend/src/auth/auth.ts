import './auth.css'
import { el } from '../lib/dom'
import { fetchApi } from '../lib/supabase'

const STORAGE_KEY = 'facelipa_user_id'
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 36 36" fill="none">
  <path d="M4 12V4h8" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
  <path d="M32 12V4h-8" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
  <path d="M4 24v8h8" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
  <path d="M32 24v8h-8" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
  <circle cx="13" cy="15" r="1.5" fill="currentColor"/>
  <circle cx="23" cy="15" r="1.5" fill="currentColor"/>
  <path d="M13 22c1.5 2 8.5 2 10 0" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/>
  <circle cx="29" cy="7" r="3" fill="#CCFF00"/>
</svg>`

export function renderAuth(onNavigate: (path: string) => void): HTMLElement {
  const page = el('div', { className: 'auth-page' })

  // ── Left graphic panel ──────────────────────────────────
  const panel = el('div', { className: 'auth-panel' })

  const panelLogo = el('div', { className: 'auth-panel-logo' })
  panelLogo.innerHTML = LOGO_SVG + '<span>FaceLipa</span>'
  panel.appendChild(panelLogo)

  // Big face-scan animation (decorative)
  const panelAnim = el('div', { className: 'auth-panel-anim' })
  panelAnim.innerHTML = `
    <div class="corner tl"></div>
    <div class="corner tr"></div>
    <div class="corner bl"></div>
    <div class="corner br"></div>
    <div class="scan"></div>
  `
  panel.appendChild(panelAnim)

  const tagline = el('div', { className: 'auth-panel-tagline' })
  const bigTitle = el('p', { className: 'auth-panel-big' })
  bigTitle.innerHTML = 'Your face.<br><span>Your wallet.</span>'
  tagline.appendChild(bigTitle)
  tagline.appendChild(el('p', { className: 'auth-panel-sub' }, 'Biometric mobile money · Tanzania'))
  panel.appendChild(tagline)

  page.appendChild(panel)

  // ── Right form panel ────────────────────────────────────
  const formPanel = el('div', { className: 'auth-form-panel' })

  const backBtn = el('button', { className: 'auth-back' }, '← Back to Home')
  backBtn.onclick = () => onNavigate('/')
  formPanel.appendChild(backBtn)

  // Tabs
  const tabs = el('div', { className: 'auth-tabs' })
  const tabSignIn = el('button', { className: 'auth-tab active', id: 'tab-sign-in' }, 'Sign In')
  const tabRegister = el('button', { className: 'auth-tab', id: 'tab-register' }, 'Register')
  tabs.appendChild(tabSignIn)
  tabs.appendChild(tabRegister)
  formPanel.appendChild(tabs)

  // ── Sign In View ──
  const signInView = el('div', { className: 'auth-view', id: 'view-sign-in' })
  signInView.appendChild(el('h1', { className: 'auth-form-title' }, 'Sign In'))
  signInView.appendChild(el('p', { className: 'auth-form-subtitle' }, 'Access your biometric wallet'))

  const siField = el('div', { className: 'auth-field' })
  siField.appendChild(el('label', { className: 'auth-label', htmlFor: 'si-uid' }, 'Your User ID'))
  const siUid = el('input', {
    className: 'auth-input', id: 'si-uid', type: 'text',
    placeholder: 'Paste your UUID from registration'
  }) as HTMLInputElement
  siField.appendChild(siUid)
  siField.appendChild(el('p', { className: 'auth-hint' }, 'You received this after registering.'))
  signInView.appendChild(siField)

  const siStatus = el('p', { className: 'auth-status' })
  signInView.appendChild(siStatus)

  const siBtn = el('button', { className: 'auth-btn' }, 'Sign In →')
  siBtn.onclick = () => {
    const uid = siUid.value.trim()
    if (!uid) { siStatus.textContent = 'Enter your User ID'; siStatus.className = 'auth-status error'; return }
    localStorage.setItem(STORAGE_KEY, uid)
    siStatus.textContent = 'Signed in! Redirecting...'
    siStatus.className = 'auth-status success'
    setTimeout(() => onNavigate('/customer'), 600)
  }
  signInView.appendChild(siBtn)

  // ── Register View ──
  const registerView = el('div', { className: 'auth-view hidden', id: 'view-register' })
  registerView.appendChild(el('h1', { className: 'auth-form-title' }, 'Register'))
  registerView.appendChild(el('p', { className: 'auth-form-subtitle' }, 'Create your biometric account · 60 seconds'))

  function field(labelText: string, inputId: string, type: string, placeholder: string): HTMLElement {
    const wrap = el('div', { className: 'auth-field' })
    wrap.appendChild(el('label', { className: 'auth-label', htmlFor: inputId }, labelText))
    wrap.appendChild(el('input', { className: 'auth-input', id: inputId, type, placeholder }))
    return wrap
  }

  const nameGrid = el('div', { className: 'auth-grid' })
  nameGrid.appendChild(field('First Name *', 'r-fname', 'text', 'John'))
  nameGrid.appendChild(field('Last Name *', 'r-lname', 'text', 'Doe'))
  registerView.appendChild(nameGrid)
  registerView.appendChild(field('Phone Number *', 'r-phone', 'tel', '255712345678'))
  registerView.appendChild(field('Email (optional)', 'r-email', 'email', 'john@example.com'))

  // Provider
  const provField = el('div', { className: 'auth-field' })
  provField.appendChild(el('label', { className: 'auth-label', htmlFor: 'r-provider' }, 'Mobile Money Provider *'))
  const provSelect = el('select', { className: 'auth-select', id: 'r-provider' })
  provSelect.appendChild(el('option', { value: 'mpesa' }, 'M-Pesa'))
  provSelect.appendChild(el('option', { value: 'airtel' }, 'Airtel Money'))
  provSelect.appendChild(el('option', { value: 'halopesa' }, 'Halopesa'))
  provSelect.appendChild(el('option', { value: 'mixx' }, 'Mixx by Yas'))
  provField.appendChild(provSelect)
  registerView.appendChild(provField)

  registerView.appendChild(field('Wallet Phone *', 'r-wphone', 'tel', 'Same number if M-Pesa'))

  // Status and submit button declared early so webcam/file handlers can reference them
  const regStatus = el('p', { className: 'auth-status' })
  const regBtn = el('button', { className: 'auth-btn', disabled: true }, 'Create Account →') as HTMLButtonElement

  // Face photo — file upload + webcam capture
  const faceField = el('div', { className: 'auth-field' })
  faceField.appendChild(el('label', { className: 'auth-label', htmlFor: 'r-face' }, 'Face Photo *'))
  faceField.appendChild(el('p', { className: 'auth-hint' }, 'Upload a photo or use your webcam — face forward, good lighting.'))

  // Toggle row: Upload | Camera
  const photoToggle = el('div', { className: 'auth-photo-toggle' })
  const btnUpload = el('button', { className: 'auth-photo-opt active', type: 'button' }, '📁 Upload File')
  const btnCamera = el('button', { className: 'auth-photo-opt', type: 'button' }, '📷 Use Camera')
  photoToggle.appendChild(btnUpload)
  photoToggle.appendChild(btnCamera)
  faceField.appendChild(photoToggle)

  // File upload row
  const uploadRow = el('div', { className: 'auth-upload-row' })
  const faceInput = el('input', { className: 'auth-input', id: 'r-face', type: 'file', accept: 'image/*' }) as HTMLInputElement
  uploadRow.appendChild(faceInput)
  faceField.appendChild(uploadRow)

  // Webcam row (hidden initially)
  const cameraRow = el('div', { className: 'auth-camera-row hidden' })
  const video = el('video', { autoplay: 'true', playsinline: 'true' }) as HTMLVideoElement
  video.style.cssText = 'width:100%;max-height:220px;display:block;border:2px solid var(--border,#050505);background:#000;'
  const captureBtn = el('button', { className: 'auth-btn', type: 'button', style: 'margin-top:0.75rem;' })
  captureBtn.innerHTML = '📸 Capture Photo'
  const canvas = document.createElement('canvas')
  canvas.style.display = 'none'
  cameraRow.appendChild(video)
  cameraRow.appendChild(captureBtn)
  cameraRow.appendChild(canvas)
  faceField.appendChild(cameraRow)

  const facePreview = el('div', { className: 'auth-preview', id: 'r-face-preview' })
  faceField.appendChild(facePreview)
  registerView.appendChild(faceField)

  let faceFile: File | null = null
  let stream: MediaStream | null = null

  // Switch to upload mode
  btnUpload.onclick = () => {
    btnUpload.classList.add('active'); btnCamera.classList.remove('active')
    uploadRow.classList.remove('hidden'); cameraRow.classList.add('hidden')
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
  }

  // Switch to camera mode
  btnCamera.onclick = async () => {
    btnCamera.classList.add('active'); btnUpload.classList.remove('active')
    uploadRow.classList.add('hidden'); cameraRow.classList.remove('hidden')
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      video.srcObject = stream
    } catch {
      cameraRow.classList.add('hidden'); uploadRow.classList.remove('hidden')
      btnUpload.classList.add('active'); btnCamera.classList.remove('active')
      alert('Camera not available — please upload a photo instead.')
    }
  }

  // Capture snapshot from webcam
  captureBtn.onclick = () => {
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      faceFile = new File([blob], 'webcam.jpg', { type: 'image/jpeg' })
      const img = document.createElement('img')
      img.src = URL.createObjectURL(faceFile)
      facePreview.innerHTML = ''
      facePreview.appendChild(img)
      facePreview.classList.add('has-img')
      regBtn.disabled = false
    }, 'image/jpeg', 0.9)
    // Stop stream after capture
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null }
    cameraRow.classList.add('hidden'); uploadRow.classList.remove('hidden')
    btnUpload.classList.add('active'); btnCamera.classList.remove('active')
    captureBtn.innerHTML = '✓ Photo Captured'
  }

  // File input handler
  faceInput.onchange = () => {
    const f = faceInput.files?.[0]
    if (!f) return
    faceFile = f
    facePreview.innerHTML = ''
    const img = document.createElement('img')
    img.src = URL.createObjectURL(f)
    facePreview.appendChild(img)
    facePreview.classList.add('has-img')
    regBtn.disabled = false
    regStatus.textContent = ''
  }

  registerView.appendChild(regStatus)
  registerView.appendChild(regBtn)

  regBtn.onclick = async () => {
    const fname = (page.querySelector('#r-fname') as HTMLInputElement).value.trim()
    const lname = (page.querySelector('#r-lname') as HTMLInputElement).value.trim()
    const phone = (page.querySelector('#r-phone') as HTMLInputElement).value.trim()
    const email = (page.querySelector('#r-email') as HTMLInputElement).value.trim()
    const provider = (page.querySelector('#r-provider') as HTMLSelectElement).value
    const wphone = (page.querySelector('#r-wphone') as HTMLInputElement).value.trim() || phone

    if (!fname) { regStatus.textContent = 'Enter first name'; regStatus.className = 'auth-status error'; return }
    if (!lname) { regStatus.textContent = 'Enter last name'; regStatus.className = 'auth-status error'; return }
    if (!phone) { regStatus.textContent = 'Enter phone number'; regStatus.className = 'auth-status error'; return }
    if (!faceFile) { regStatus.textContent = 'Upload a face photo'; regStatus.className = 'auth-status error'; return }

    regBtn.disabled = true
    regStatus.textContent = 'Analyzing face...'
    regStatus.className = 'auth-status'

    let embedding: number[] | null = null
    try {
      const { getFaceEmbeddingFromFile } = await import('../lib/face')
      embedding = await getFaceEmbeddingFromFile(faceFile)
    } catch (e) {
      regStatus.textContent = `Face error: ${(e as Error).message}`
      regStatus.className = 'auth-status error'
      regBtn.disabled = false
      return
    }

    if (!embedding) {
      regStatus.textContent = 'No face detected — use a clear, front-facing photo.'
      regStatus.className = 'auth-status error'
      regBtn.disabled = false
      return
    }

    regStatus.textContent = 'Registering account...'
    try {
      const res = await fetchApi('/register-customer', {
        method: 'POST',
        body: JSON.stringify({
          first_name: fname, last_name: lname,
          phone_number: phone, email: email || undefined,
          wallet_provider: provider, wallet_phone: wphone,
          embedding,
        }),
      })
      const data = await res.json()
      if (data.error) {
        regStatus.textContent = data.error
        regStatus.className = 'auth-status error'
        regBtn.disabled = false
        return
      }
      localStorage.setItem(STORAGE_KEY, data.user_id)
      regStatus.textContent = `✓ Registered! User ID: ${data.user_id}`
      regStatus.className = 'auth-status success'
      setTimeout(() => onNavigate('/customer'), 1000)
    } catch (e) {
      regStatus.textContent = `Error: ${(e as Error).message}`
      regStatus.className = 'auth-status error'
      regBtn.disabled = false
    }
  }

  formPanel.appendChild(signInView)
  formPanel.appendChild(registerView)
  page.appendChild(formPanel)

  // Tab switching
  tabSignIn.onclick = () => {
    tabSignIn.classList.add('active')
    tabRegister.classList.remove('active')
    signInView.classList.remove('hidden')
    registerView.classList.add('hidden')
  }
  tabRegister.onclick = () => {
    tabRegister.classList.add('active')
    tabSignIn.classList.remove('active')
    registerView.classList.remove('hidden')
    signInView.classList.add('hidden')
  }

  // If a UID in localStorage already, auto-fill
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) siUid.value = saved

  return page
}
