import './auth.css'
import { el } from '../lib/dom'

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

export function renderMerchantAuth(onNavigate: (path: string) => void): HTMLElement {
  const page = el('div', { className: 'auth-page' })

  // ── Left graphic panel ──────────────────────────────────
  const panel = el('div', { className: 'auth-panel' })

  const panelLogo = el('div', { className: 'auth-panel-logo' })
  panelLogo.innerHTML = LOGO_SVG + '<span>FaceLipa</span>'
  panel.appendChild(panelLogo)

  const panelAnim = el('div', { className: 'auth-panel-anim' })
  panelAnim.innerHTML = `
    <div class="corner tl"></div><div class="corner tr"></div>
    <div class="corner bl"></div><div class="corner br"></div>
    <div class="scan"></div>`
  panel.appendChild(panelAnim)

  const tagline = el('div', { className: 'auth-panel-tagline' })
  const bigTitle = el('p', { className: 'auth-panel-big' })
  bigTitle.innerHTML = 'Charge<br><span>by face.</span>'
  tagline.appendChild(bigTitle)
  tagline.appendChild(el('p', { className: 'auth-panel-sub' }, 'Merchant terminal · Accept face payments in seconds'))
  panel.appendChild(tagline)
  page.appendChild(panel)

  // ── Right form panel ────────────────────────────────────
  const formPanel = el('div', { className: 'auth-form-panel' })

  const backBtn = el('button', { className: 'auth-back' }, '← Back to Home')
  backBtn.onclick = () => onNavigate('/')
  formPanel.appendChild(backBtn)

  // Tabs: Sign In + Get Access
  const tabs = el('div', { className: 'auth-tabs' })
  const tabSignIn = el('button', { className: 'auth-tab active', id: 'mtab-signin' }, 'Sign In')
  const tabGetAccess = el('button', { className: 'auth-tab', id: 'mtab-access' }, 'Get Access')
  tabs.appendChild(tabSignIn)
  tabs.appendChild(tabGetAccess)
  formPanel.appendChild(tabs)

  // ── Sign In View ──
  const signInView = el('div', { className: 'auth-view', id: 'mview-signin' })
  signInView.appendChild(el('h1', { className: 'auth-form-title' }, 'Merchant Login'))
  signInView.appendChild(el('p', { className: 'auth-form-subtitle' }, 'Enter credentials issued when your terminal was set up'))

  const midField = el('div', { className: 'auth-field' })
  midField.appendChild(el('label', { className: 'auth-label', htmlFor: 'm-id' }, 'Merchant ID'))
  const midInput = el('input', { className: 'auth-input', id: 'm-id', type: 'text', placeholder: 'Your merchant UUID' }) as HTMLInputElement
  midField.appendChild(midInput)
  formPanel.appendChild(midField)

  const mkeyField = el('div', { className: 'auth-field' })
  mkeyField.appendChild(el('label', { className: 'auth-label', htmlFor: 'm-key' }, 'API Key'))
  const mkeyInput = el('input', { className: 'auth-input', id: 'm-key', type: 'password', placeholder: '••••••••••••••' }) as HTMLInputElement
  mkeyField.appendChild(mkeyInput)

  signInView.appendChild(midField)
  signInView.appendChild(mkeyField)

  const siStatus = el('p', { className: 'auth-status' })
  signInView.appendChild(siStatus)

  const loginBtn = el('button', { className: 'auth-btn' }, 'Access Terminal →')
  loginBtn.onclick = () => {
    const mid = midInput.value.trim()
    const mkey = mkeyInput.value.trim()
    if (!mid) { siStatus.textContent = 'Enter Merchant ID'; siStatus.className = 'auth-status error'; return }
    if (!mkey) { siStatus.textContent = 'Enter API Key'; siStatus.className = 'auth-status error'; return }
    localStorage.setItem('facelipa_merchant_id', mid)
    localStorage.setItem('facelipa_merchant_key', mkey)
    siStatus.textContent = 'Authenticated — loading terminal...'
    siStatus.className = 'auth-status success'
    setTimeout(() => onNavigate('/merchant'), 600)
  }
  signInView.appendChild(loginBtn)

  // ── Get Access View ──
  const accessView = el('div', { className: 'auth-view hidden', id: 'mview-access' })
  accessView.appendChild(el('h1', { className: 'auth-form-title' }, 'Get Access'))
  accessView.appendChild(el('p', { className: 'auth-form-subtitle' }, 'How to get your merchant terminal credentials'))

  const steps = [
    {
      num: '01',
      title: 'Contact FaceLipa',
      body: 'Reach out to the FaceLipa team to onboard your business. We\'ll set up your merchant account in the system.'
    },
    {
      num: '02',
      title: 'Receive Credentials',
      body: 'You\'ll receive a Merchant ID (UUID) and an API Key. Keep these safe — they authenticate every charge.'
    },
    {
      num: '03',
      title: 'Go Live',
      body: 'Sign in with your credentials, upload a customer\'s face photo, enter the amount, and hit Charge. The customer gets a USSD push and enters their PIN to confirm.'
    },
  ]

  const stepsWrap = el('div', { className: 'auth-steps' })
  steps.forEach(s => {
    const step = el('div', { className: 'auth-step' })
    step.innerHTML = `
      <div class="auth-step-num">${s.num}</div>
      <div class="auth-step-body">
        <strong>${s.title}</strong>
        <p>${s.body}</p>
      </div>`
    stepsWrap.appendChild(step)
  })
  accessView.appendChild(stepsWrap)

  // How it works: the charge flow per README
  const infoBox = el('div', { className: 'auth-info-box' })
  infoBox.innerHTML = `
    <p class="auth-info-title">The charge flow</p>
    <ul class="auth-info-list">
      <li>Merchant uploads customer face → FaceLipa identifies them</li>
      <li>Enter TZS amount + optional reference</li>
      <li>Customer receives STK/USSD push</li>
      <li>Customer enters PIN → balance deducted instantly</li>
      <li>Supported networks: M-Pesa · Airtel · Halopesa · Mixx</li>
    </ul>`
  accessView.appendChild(infoBox)

  const contactBtn = el('button', { className: 'auth-btn' }, 'Already have credentials? Sign In →')
  contactBtn.onclick = () => {
    tabSignIn.click()
  }
  accessView.appendChild(contactBtn)

  formPanel.appendChild(signInView)
  formPanel.appendChild(accessView)
  page.appendChild(formPanel)

  // Tab switching
  tabSignIn.onclick = () => {
    tabSignIn.classList.add('active')
    tabGetAccess.classList.remove('active')
    signInView.classList.remove('hidden')
    accessView.classList.add('hidden')
  }
  tabGetAccess.onclick = () => {
    tabGetAccess.classList.add('active')
    tabSignIn.classList.remove('active')
    accessView.classList.remove('hidden')
    signInView.classList.add('hidden')
  }

  // Pre-fill if already logged in
  const savedMid = localStorage.getItem('facelipa_merchant_id')
  const savedMkey = localStorage.getItem('facelipa_merchant_key')
  if (savedMid) midInput.value = savedMid
  if (savedMkey) mkeyInput.value = savedMkey

  return page
}
