import './styles.css'
import { el, mount } from './lib/dom'
import { renderLanding } from './landing/landing'

const app = document.getElementById('app')!

function showView(path: string): void {
  const normalized = path.replace(/\/$/, '') || '/'

  if (normalized === '/' || normalized === '') {
    document.getElementById('app')!.classList.add('full-width')
    document.getElementById('app')!.classList.remove('app-portal')
    mount(app, renderLanding((p) => {
      window.history.pushState({}, '', p)
      showView(p)
    }))
    return
  }

  document.getElementById('app')!.classList.remove('full-width')
  document.getElementById('app')!.classList.add('app-portal')

  if (normalized === '/merchant') {
    import('./merchant/merchant').then(({ renderMerchant }) => {
      const wrapper = el('div', { className: 'app-wrapper' })
      const nav = el('nav', { className: 'app-nav' })
      const logoLink = el('a', { href: '/', className: 'app-nav-logo' }, 'FaceLipa')
      const homeLink = el('a', { href: '/' }, 'Home')
      const bankLink = el('a', { href: '/bank' }, 'Customer')
      const merchantLink = el('a', { href: '/merchant', className: 'active' }, 'Merchant')
      logoLink.onclick = (e) => { e.preventDefault(); window.history.pushState({}, '', '/'); showView('/') }
      homeLink.onclick = (e) => { e.preventDefault(); window.history.pushState({}, '', '/'); showView('/') }
      bankLink.onclick = (e) => { e.preventDefault(); window.history.pushState({}, '', '/bank'); showView('/bank') }
      merchantLink.onclick = (e) => { e.preventDefault() }
      nav.appendChild(logoLink)
      const navLinks = el('div', { className: 'app-nav-links' })
      navLinks.appendChild(homeLink)
      navLinks.appendChild(bankLink)
      navLinks.appendChild(merchantLink)
      nav.appendChild(navLinks)
      wrapper.appendChild(nav)
      wrapper.appendChild(renderMerchant())
      mount(app, wrapper)
    })
    return
  }

  if (normalized === '/bank') {
    import('./bank/bank').then(({ renderBank }) => {
      const wrapper = el('div', { className: 'app-wrapper' })
      const nav = el('nav', { className: 'app-nav' })
      const logoLink = el('a', { href: '/', className: 'app-nav-logo' }, 'FaceLipa')
      const homeLink = el('a', { href: '/' }, 'Home')
      const bankLink = el('a', { href: '/bank', className: 'active' }, 'Customer')
      const merchantLink = el('a', { href: '/merchant' }, 'Merchant')
      logoLink.onclick = (e) => { e.preventDefault(); window.history.pushState({}, '', '/'); showView('/') }
      homeLink.onclick = (e) => { e.preventDefault(); window.history.pushState({}, '', '/'); showView('/') }
      bankLink.onclick = (e) => { e.preventDefault() }
      merchantLink.onclick = (e) => {
        e.preventDefault()
        window.history.pushState({}, '', '/merchant')
        showView('/merchant')
      }
      nav.appendChild(logoLink)
      const navLinks = el('div', { className: 'app-nav-links' })
      navLinks.appendChild(homeLink)
      navLinks.appendChild(bankLink)
      navLinks.appendChild(merchantLink)
      nav.appendChild(navLinks)
      wrapper.appendChild(nav)
      wrapper.appendChild(renderBank())
      mount(app, wrapper)
    })
    return
  }

  document.getElementById('app')!.classList.add('full-width')
  document.getElementById('app')!.classList.remove('app-portal')
  mount(app, renderLanding((p) => {
    window.history.pushState({}, '', p)
    showView(p)
  }))
}

window.addEventListener('popstate', () => showView(window.location.pathname))

showView(window.location.pathname)
