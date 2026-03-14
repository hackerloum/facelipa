import './styles.css'
import { el, mount } from './lib/dom'
import { renderLanding } from './landing/landing'

const app = document.getElementById('app')!

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 36 36" fill="none">
  <path d="M4 12V4h8" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
  <path d="M32 12V4h-8" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
  <path d="M4 24v8h8" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
  <path d="M32 24v8h-8" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
  <circle cx="13" cy="15" r="1.5" fill="currentColor"/>
  <circle cx="23" cy="15" r="1.5" fill="currentColor"/>
  <path d="M13 22c1.5 2 8.5 2 10 0" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/>
  <circle cx="29" cy="7" r="3" fill="#CCFF00"/>
</svg>`

function buildPortalNav(portalName: string, homePath: string, navigate: (p: string) => void): HTMLElement {
  const nav = el('nav', { className: 'portal-nav' })
  nav.style.cssText = `
    display:flex; align-items:center; justify-content:space-between;
    padding:1rem 1.5rem; border-bottom:3px solid var(--border,#050505);
    background:var(--bg,#F4F4F0); position:sticky; top:0; z-index:100;
    font-family:'Space Grotesk',system-ui,sans-serif;
  `
  // Left: Logo + portal tag
  const left = el('div', {})
  left.style.cssText = 'display:flex;align-items:center;gap:0.75rem;'
  const logoEl = el('div', {})
  logoEl.innerHTML = LOGO_SVG
  const logoText = el('span', {})
  logoText.style.cssText = 'font-size:1.25rem;font-weight:800;text-transform:uppercase;letter-spacing:-0.03em;'
  logoText.textContent = 'FaceLipa'
  const tag = el('span', {})
  tag.style.cssText = `
    font-family:'Space Mono',monospace; font-size:0.65rem; font-weight:700;
    text-transform:uppercase; letter-spacing:0.08em;
    background:var(--text,#050505); color:var(--bg,#F4F4F0);
    padding:0.2rem 0.5rem;
  `
  tag.textContent = portalName
  left.appendChild(logoEl)
  left.appendChild(logoText)
  left.appendChild(tag)
  // Right: back link
  const backBtn = el('a', { href: homePath })
  backBtn.style.cssText = `
    display:inline-flex; align-items:center; gap:0.35rem;
    font-size:0.8rem; font-weight:700; text-transform:uppercase;
    letter-spacing:0.05em; color:var(--text,#050505); text-decoration:none;
    padding:0.5rem 0.85rem; border:2px solid var(--border,#050505);
    box-shadow:3px 3px 0 var(--border,#050505);
  `
  backBtn.innerHTML = '← Home'
  backBtn.onclick = (e) => { e.preventDefault(); window.history.pushState({}, '', homePath); navigate(homePath) }
  nav.appendChild(left)
  nav.appendChild(backBtn)
  return nav
}


function showView(path: string): void {
  const normalized = path.replace(/\/$/, '') || '/'
  const appEl = document.getElementById('app')!

  // Landing page gets the full-width class; inner pages also need full-width
  // because they control their own max-width via inner CSS containers
  appEl.classList.add('full-width')

  if (normalized === '/' || normalized === '') {
    mount(app, renderLanding((p) => {
      window.history.pushState({}, '', p)
      showView(p)
    }))
    return
  }

  if (normalized === '/login') {
    import('./auth/auth').then(({ renderAuth }) => {
      mount(app, renderAuth((p) => {
        window.history.pushState({}, '', p)
        showView(p)
      }))
    }).catch(err => {
      console.error('[FaceLipa] Failed to load /login:', err)
      app.innerHTML = `<div style="padding:2rem;font-family:monospace;color:red">Failed to load login page: ${err.message}</div>`
    })
    return
  }

  if (normalized === '/merchant-login') {
    import('./auth/merchant-auth').then(({ renderMerchantAuth }) => {
      mount(app, renderMerchantAuth((p) => {
        window.history.pushState({}, '', p)
        showView(p)
      }))
    }).catch(err => {
      console.error('[FaceLipa] Failed to load /merchant-login:', err)
    })
    return
  }

  if (normalized === '/merchant') {
    import('./merchant/merchant').then(({ renderMerchant }) => {
      const wrapper = el('div', { className: 'app-wrapper' })
      wrapper.appendChild(buildPortalNav('Merchant Portal', '/merchant-login', showView))
      wrapper.appendChild(renderMerchant())
      mount(app, wrapper)
    })
    return
  }

  if (normalized === '/bank') {
    import('./bank/bank').then(({ renderBank }) => {
      const wrapper = el('div', { className: 'app-wrapper' })
      wrapper.appendChild(buildPortalNav('Customer Portal', '/login', showView))
      wrapper.appendChild(renderBank())
      mount(app, wrapper)
    })
    return
  }

  // Fallback → landing
  mount(app, renderLanding((p) => {
    window.history.pushState({}, '', p)
    showView(p)
  }))
}

window.addEventListener('popstate', () => showView(window.location.pathname))

showView(window.location.pathname)
