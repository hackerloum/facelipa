import { el } from '../lib/dom'
import './landing.css'

export function renderLanding(onNavigate: (path: string) => void): HTMLElement {
  const root = el('div', { className: 'landing' })

  const hero = el('div', { className: 'landing-hero' })
  hero.appendChild(el('h1', { className: 'landing-title' }, 'FaceLipa'))
  hero.appendChild(el('p', { className: 'landing-tagline' }, 'Pay with your face. No phone, no card.'))
  hero.appendChild(el('p', { className: 'landing-desc' }, 'Register your face once, then pay at any shop with a quick scan. Secure. Fast. Simple.'))
  root.appendChild(hero)

  const cards = el('div', { className: 'landing-cards' })

  const customerCard = el('div', { className: 'landing-card' })
  customerCard.appendChild(el('div', { className: 'landing-card-icon' }, '👤'))
  customerCard.appendChild(el('h2', { className: 'landing-card-title' }, 'I\'m a Customer'))
  customerCard.appendChild(el('p', { className: 'landing-card-desc' }, 'Register your face, link your mobile money, and pay at shops with a smile.'))
  const btnCustomer = el('button', { className: 'btn btn-primary landing-btn' }, 'Get Started')
  btnCustomer.onclick = () => onNavigate('/bank')
  customerCard.appendChild(btnCustomer)
  cards.appendChild(customerCard)

  const merchantCard = el('div', { className: 'landing-card' })
  merchantCard.appendChild(el('div', { className: 'landing-card-icon' }, '🏪'))
  merchantCard.appendChild(el('h2', { className: 'landing-card-title' }, 'I\'m a Merchant'))
  merchantCard.appendChild(el('p', { className: 'landing-card-desc' }, 'Accept face payments at your shop. Capture customer face, they enter PIN on their phone.'))
  const btnMerchant = el('button', { className: 'btn btn-secondary landing-btn' }, 'Merchant Login')
  btnMerchant.onclick = () => onNavigate('/merchant')
  merchantCard.appendChild(btnMerchant)
  cards.appendChild(merchantCard)

  root.appendChild(cards)

  const footer = el('p', { className: 'landing-footer' }, 'Biometric mobile money · Tanzania')
  root.appendChild(footer)

  return root
}
