import { el } from '../lib/dom'
import './landing.css'

export function renderLanding(onNavigate: (path: string) => void): HTMLElement {
  const root = el('div', { className: 'landing-page' })

  // Nav
  const nav = el('nav', { className: 'lp-nav' })
  nav.appendChild(el('span', { className: 'lp-logo' }, 'FaceLipa'))
  const navLinks = el('div', { className: 'lp-nav-links' })
  const btnCustomer = el('button', { className: 'lp-btn lp-btn-ghost' }, 'For Customers')
  const btnMerchant = el('button', { className: 'lp-btn lp-btn-primary' }, 'For Merchants')
  btnCustomer.onclick = () => onNavigate('/register')
  btnMerchant.onclick = () => onNavigate('/merchant')
  navLinks.appendChild(btnCustomer)
  navLinks.appendChild(btnMerchant)
  nav.appendChild(navLinks)
  root.appendChild(nav)

  // Hero
  const hero = el('section', { className: 'lp-hero' })
  hero.appendChild(el('p', { className: 'lp-badge' }, 'The future of payments in Africa'))
  hero.appendChild(el('h1', { className: 'lp-hero-title' }, 'Pay with your face.\nNo card. No phone. No friction.'))
  hero.appendChild(el('p', { className: 'lp-hero-desc' }, 'FaceLipa turns your face into your wallet. One enrollment, instant payments everywhere. Built for Tanzania, powered by biometrics.'))
  const heroCtas = el('div', { className: 'lp-hero-ctas' })
  const ctaPrimary = el('button', { className: 'lp-btn lp-btn-primary lp-btn-lg' }, 'Get Started Free')
  const ctaSecondary = el('button', { className: 'lp-btn lp-btn-outline lp-btn-lg' }, 'Merchant Login')
  ctaPrimary.onclick = () => onNavigate('/register')
  ctaSecondary.onclick = () => onNavigate('/merchant')
  heroCtas.appendChild(ctaPrimary)
  heroCtas.appendChild(ctaSecondary)
  hero.appendChild(heroCtas)
  hero.appendChild(el('p', { className: 'lp-hero-trust' }, 'Integrated with M-Pesa · Airtel Money · Halopesa · Mixx'))
  root.appendChild(hero)

  // Stats
  const stats = el('section', { className: 'lp-stats' })
  const statItems = [
    ['&lt;2s', 'Payment time'],
    ['128-d', 'Biometric security'],
    ['0', 'Cards or phones needed'],
  ]
  statItems.forEach(([val, label]) => {
    const item = el('div', { className: 'lp-stat' })
    item.appendChild(el('span', { className: 'lp-stat-value' }, val))
    item.appendChild(el('span', { className: 'lp-stat-label' }, label))
    stats.appendChild(item)
  })
  root.appendChild(stats)

  // Features
  const features = el('section', { className: 'lp-features' })
  features.appendChild(el('h2', { className: 'lp-section-title' }, 'Why merchants choose FaceLipa'))
  const featureGrid = el('div', { className: 'lp-feature-grid' })
  const featureList = [
    { icon: '⚡', title: 'Instant checkout', desc: 'No card readers, no QR codes. Face scan and done.' },
    { icon: '🔒', title: 'Bank-grade security', desc: '128-dimensional face embeddings. Your face, your identity.' },
    { icon: '📱', title: 'Mobile money native', desc: 'M-Pesa, Airtel, Halopesa. One platform, all networks.' },
    { icon: '📈', title: 'Higher conversion', desc: 'Faster lines, happier customers. More sales per hour.' },
  ]
  featureList.forEach((f) => {
    const card = el('div', { className: 'lp-feature-card' })
    card.appendChild(el('span', { className: 'lp-feature-icon' }, f.icon))
    card.appendChild(el('h3', { className: 'lp-feature-title' }, f.title))
    card.appendChild(el('p', { className: 'lp-feature-desc' }, f.desc))
    featureGrid.appendChild(card)
  })
  features.appendChild(featureGrid)
  root.appendChild(features)

  // How it works
  const how = el('section', { className: 'lp-how' })
  how.appendChild(el('h2', { className: 'lp-section-title' }, 'How it works'))
  const steps = el('div', { className: 'lp-steps' })
  const stepList = [
    { n: '1', title: 'Enroll once', desc: 'Register your face and link your mobile money. Takes 30 seconds.' },
    { n: '2', title: 'Shop anywhere', desc: 'At any FaceLipa merchant, just look at the camera.' },
    { n: '3', title: 'Enter PIN', desc: 'Confirm on your phone. Payment complete. No card, no cash.' },
  ]
  stepList.forEach((s) => {
    const step = el('div', { className: 'lp-step' })
    step.appendChild(el('span', { className: 'lp-step-num' }, s.n))
    step.appendChild(el('h3', { className: 'lp-step-title' }, s.title))
    step.appendChild(el('p', { className: 'lp-step-desc' }, s.desc))
    steps.appendChild(step)
  })
  how.appendChild(steps)
  root.appendChild(how)

  // CTA
  const cta = el('section', { className: 'lp-cta' })
  cta.appendChild(el('h2', { className: 'lp-cta-title' }, 'Ready to pay with your face?'))
  cta.appendChild(el('p', { className: 'lp-cta-desc' }, 'Join the future of payments. Free for customers. Simple for merchants.'))
  const ctaBtns = el('div', { className: 'lp-cta-btns' })
  const cta1 = el('button', { className: 'lp-btn lp-btn-primary lp-btn-lg' }, 'Start as Customer')
  const cta2 = el('button', { className: 'lp-btn lp-btn-outline lp-btn-lg' }, 'Start as Merchant')
  cta1.onclick = () => onNavigate('/register')
  cta2.onclick = () => onNavigate('/merchant')
  ctaBtns.appendChild(cta1)
  ctaBtns.appendChild(cta2)
  cta.appendChild(ctaBtns)
  root.appendChild(cta)

  // Footer
  const footer = el('footer', { className: 'lp-footer' })
  footer.appendChild(el('span', { className: 'lp-footer-logo' }, 'FaceLipa'))
  footer.appendChild(el('p', { className: 'lp-footer-tag' }, 'Biometric mobile money · Tanzania'))
  root.appendChild(footer)

  return root
}
