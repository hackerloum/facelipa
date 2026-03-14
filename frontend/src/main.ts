import './styles.css'
import { el, mount } from './lib/dom'
import { renderBank } from './bank/bank'
import { renderMerchant } from './merchant/merchant'

const app = document.getElementById('app')!

function render(isMerchant: boolean): HTMLElement {
  const wrapper = el('div', { className: 'app-wrapper' })
  const nav = el('nav', { className: 'app-nav' })
  const bankLink = el('a', { href: '/', className: !isMerchant ? 'active' : '' }, 'Bank')
  const merchantLink = el('a', { href: '/merchant', className: isMerchant ? 'active' : '' }, 'Merchant')
  bankLink.onclick = (e) => {
    e.preventDefault()
    window.history.pushState({}, '', '/')
    mount(app, render(false))
  }
  merchantLink.onclick = (e) => {
    e.preventDefault()
    window.history.pushState({}, '', '/merchant')
    mount(app, render(true))
  }
  nav.appendChild(bankLink)
  nav.appendChild(merchantLink)
  wrapper.appendChild(nav)
  wrapper.appendChild(isMerchant ? renderMerchant() : renderBank())
  return wrapper
}

const path = window.location.pathname.replace(/\/$/, '') || '/'
const isMerchant = path === '/merchant'
mount(app, render(isMerchant))
