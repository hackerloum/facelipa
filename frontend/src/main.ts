import './styles.css'
import { el, mount } from './lib/dom'
import { renderLanding } from './landing/landing'

const app = document.getElementById('app')!

function showView(path: string): void {
  const normalized = path.replace(/\/$/, '') || '/'

  if (normalized === '/' || normalized === '') {
    mount(app, renderLanding((p) => {
      window.history.pushState({}, '', p)
      showView(p)
    }))
    return
  }

  if (normalized === '/merchant') {
    import('./merchant/merchant').then(({ renderMerchant }) => {
      const wrapper = el('div', { className: 'app-wrapper' })
      const nav = el('nav', { className: 'app-nav' })
      const bankLink = el('a', { href: '/' }, 'Home')
      const merchantLink = el('a', { href: '/merchant', className: 'active' }, 'Merchant')
      bankLink.onclick = (e) => { e.preventDefault(); window.history.pushState({}, '', '/'); showView('/') }
      merchantLink.onclick = (e) => { e.preventDefault() }
      nav.appendChild(bankLink)
      nav.appendChild(merchantLink)
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
      const bankLink = el('a', { href: '/bank', className: 'active' }, 'Bank')
      const merchantLink = el('a', { href: '/merchant' }, 'Merchant')
      bankLink.onclick = (e) => { e.preventDefault() }
      merchantLink.onclick = (e) => {
        e.preventDefault()
        window.history.pushState({}, '', '/merchant')
        showView('/merchant')
      }
      nav.appendChild(bankLink)
      nav.appendChild(merchantLink)
      wrapper.appendChild(nav)
      wrapper.appendChild(renderBank())
      mount(app, wrapper)
    })
    return
  }

  mount(app, renderLanding((p) => {
    window.history.pushState({}, '', p)
    showView(p)
  }))
}

window.addEventListener('popstate', () => showView(window.location.pathname))

showView(window.location.pathname)
