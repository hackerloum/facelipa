import { el } from '../lib/dom'
import './landing.css'

// --- SVG Icons ---
const ICONS = {
  moon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  sun: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2m-7.07-14.07 1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2m-4.93-7.07-1.41 1.41M6.34 17.66l-1.41 1.41"/></svg>`,
  zap: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>`,
  smartphone: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`,
  trendingUp: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  userPlus: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>`,
  scanFace: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>`,
  checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  arrowRight: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M5 12h14M12 5l7 7-7 7"/></svg>`,
}

// Logo — stark brutalist face-scan mark
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
  <!-- outer scan frame corners -->
  <path d="M4 12V4h8" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
  <path d="M32 12V4h-8" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
  <path d="M4 24v8h8" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
  <path d="M32 24v8h-8" stroke="currentColor" stroke-width="3" stroke-linecap="square"/>
  <!-- face dots (eyes) -->
  <circle cx="13" cy="15" r="1.5" fill="currentColor"/>
  <circle cx="23" cy="15" r="1.5" fill="currentColor"/>
  <!-- smile -->
  <path d="M13 22c1.5 2 8.5 2 10 0" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"/>
  <!-- accent lime dot -->
  <circle cx="29" cy="7" r="3" fill="#CCFF00"/>
</svg>`

export function renderLanding(onNavigate: (path: string) => void): HTMLElement {
  const root = el('div', { className: 'landing-page' })

  // =========================================================
  // NAV
  // =========================================================
  const nav = el('nav', { className: 'lp-nav' })

  const logo = el('a', { className: 'lp-logo', href: '#' })
  logo.innerHTML = LOGO_SVG + '<span>FaceLipa</span>'
  logo.onclick = (e) => { e.preventDefault() }

  const navActions = el('div', { className: 'lp-nav-actions' })

  const themeToggle = el('button', { className: 'lp-theme-toggle', 'aria-label': 'Toggle theme' })
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  themeToggle.innerHTML = isDark ? ICONS.sun : ICONS.moon
  themeToggle.onclick = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    themeToggle.innerHTML = next === 'dark' ? ICONS.sun : ICONS.moon
  }

  const navBtnCustomer = el('button', { className: 'lp-btn lp-btn-outline' }, 'Customers')
  const navBtnMerchant = el('button', { className: 'lp-btn lp-btn-primary' }, 'Merchants')
  navBtnCustomer.onclick = () => onNavigate('/login')
  navBtnMerchant.onclick = () => onNavigate('/merchant-login')

  navActions.appendChild(themeToggle)
  navActions.appendChild(navBtnCustomer)
  navActions.appendChild(navBtnMerchant)
  nav.appendChild(logo)
  nav.appendChild(navActions)
  root.appendChild(nav)

  // =========================================================
  // HERO
  // =========================================================
  const hero = el('section', { className: 'lp-hero' })

  // — Left content column
  const heroContent = el('div', { className: 'lp-hero-content' })

  const badge = el('div', { className: 'lp-badge' })
  badge.innerHTML = `<span class="lp-badge-dot"></span>Live on M-Pesa · Airtel · Halopesa`
  heroContent.appendChild(badge)

  const title = el('h1', { className: 'lp-hero-title' })
  title.innerHTML = `Pay<br><span>with<br>your<br>face.</span>`
  heroContent.appendChild(title)

  heroContent.appendChild(el('p', { className: 'lp-hero-desc' },
    'FaceLipa turns your face into your wallet. One 30-second enrollment — instant, cardless payments everywhere in Tanzania.'))

  const heroCtas = el('div', { className: 'lp-hero-ctas' })
  const ctaMain = el('button', { className: 'lp-btn lp-btn-primary lp-btn-lg' })
  ctaMain.innerHTML = 'Get Started ' + ICONS.arrowRight
  const ctaAlt = el('button', { className: 'lp-btn lp-btn-outline lp-btn-lg' }, 'Merchant Login')
  ctaMain.onclick = () => onNavigate('/login')
  ctaAlt.onclick = () => onNavigate('/merchant-login')
  heroCtas.appendChild(ctaMain)
  heroCtas.appendChild(ctaAlt)
  heroContent.appendChild(heroCtas)

  hero.appendChild(heroContent)

  // — Right graphic: animated face scan
  const heroGraphic = el('div', { className: 'lp-hero-graphic' })

  const scanFrame = el('div', { className: 'lp-scan-frame' })
  // Corner brackets
  scanFrame.appendChild(el('div', { className: 'lp-corner tl' }))
  scanFrame.appendChild(el('div', { className: 'lp-corner tr' }))
  scanFrame.appendChild(el('div', { className: 'lp-corner bl' }))
  scanFrame.appendChild(el('div', { className: 'lp-corner br' }))
  // Ghost face icon
  const scanFaceIcon = el('div', { className: 'lp-scan-face-icon' })
  scanFaceIcon.innerHTML = ICONS.scanFace
  scanFrame.appendChild(scanFaceIcon)
  // Facial landmark dots
  for (let i = 0; i < 8; i++) {
    scanFrame.appendChild(el('div', { className: 'lp-landmark' }))
  }
  // Mesh SVG — triangle net connecting key landmarks
  const meshSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  meshSvg.setAttribute('class', 'lp-mesh-svg')
  meshSvg.setAttribute('viewBox', '0 0 220 260')
  const meshLines = [
    '30,91 66,91', '154,91 190,91',   // eye horizontals
    '66,91 110,130', '154,91 110,130', // cheeks to nose
    '110,130 82,166', '110,130 138,166', // nose to mouth corners
    '30,62 66,91',   // left temple to eye
    '190,62 154,91', // right temple to eye
    '82,166 110,208', '138,166 110,208', // mouth to chin
  ]
  meshLines.forEach(coords => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    const [x1y1, x2y2] = coords.split(' ')
    const [x1, y1] = x1y1.split(',')
    const [x2, y2] = x2y2.split(',')
    line.setAttribute('x1', x1)
    line.setAttribute('y1', y1)
    line.setAttribute('x2', x2)
    line.setAttribute('y2', y2)
    line.setAttribute('stroke', '#CCFF00')
    line.setAttribute('stroke-width', '1')
    meshSvg.appendChild(line)
  })
  scanFrame.appendChild(meshSvg)
  // Scan line overlay
  const scanLine = el('div', { className: 'lp-scan-line' })
  scanFrame.appendChild(scanLine)

  // Binary data rain column
  const dataRain = el('div', { className: 'lp-data-rain' })
  const binaryChars = ['0', '1']
  for (let col = 0; col < 8; col++) {
    const column = el('span', { className: 'lp-data-col' })
    let str = ''
    for (let row = 0; row < 12; row++) {
      str += binaryChars[Math.floor(Math.random() * 2)] + '\n'
    }
    column.textContent = str
    column.style.animationDelay = `${col * 0.15}s`
    dataRain.appendChild(column)
  }

  // Status line
  const statusLine = el('div', { className: 'lp-scan-status' })
  statusLine.innerHTML = `<span class="lp-status-dot"></span><span class="lp-status-text">SCANNING...</span>`

  heroGraphic.appendChild(dataRain)
  heroGraphic.appendChild(scanFrame)

  // HUD labels
  const hud = el('div', { className: 'lp-scan-hud' })
  const hudTL = el('div', { className: 'lp-hud-label tl' })
  hudTL.innerHTML = 'FaceLipa v2.1<br/>AUTH ENGINE'
  const hudTR = el('div', { className: 'lp-hud-label tr blink' })
  hudTR.innerHTML = 'LIVE<br/>REC'
  const hudBL = el('div', { className: 'lp-hud-label bl' })
  hudBL.innerHTML = 'VEC: 128D<br/>MATCH: 99.97%'
  const hudBR = el('div', { className: 'lp-hud-label br' })
  hudBR.innerHTML = 'TZ / DAR ES SALAAM<br/>M-PESA LINKED'
  hud.appendChild(hudTL)
  hud.appendChild(hudTR)
  hud.appendChild(hudBL)
  hud.appendChild(hudBR)
  heroGraphic.appendChild(hud)

  heroGraphic.appendChild(statusLine)
  hero.appendChild(heroGraphic)

  root.appendChild(hero)

  // =========================================================
  // MARQUEE — scrolling partners ticker
  // =========================================================
  const marqueeWrap = el('div', { className: 'lp-marquee-wrap' })
  const marquee = el('div', { className: 'lp-marquee' })
  // Duplicate twice for seamless loop
  for (let i = 0; i < 2; i++) {
    const inner = el('div', { className: 'lp-marquee-inner' })
    inner.innerHTML = [
      'M-Pesa', 'Airtel Money', 'Halopesa', 'Mixx by Yas',
      'Biometric Auth', 'Face ID', 'Zero Friction', 'Instant Payments'
    ].map(s => `<span>${s}</span><span class="lp-marquee-sep">✦</span>`).join('')
    marquee.appendChild(inner)
  }
  marqueeWrap.appendChild(marquee)
  root.appendChild(marqueeWrap)

  // =========================================================
  // STATS
  // =========================================================
  const stats = el('section', { className: 'lp-stats' })
  const statItems: [string, string, string][] = [
    ['<2s', 'Payment time', 'End-to-end from face scan to receipt'],
    ['128D', 'Face vectors', 'Bank-grade biometric accuracy'],
    ['0', 'Cards needed', 'Your face is the only credential'],
  ]
  statItems.forEach(([val, label, sub]) => {
    const item = el('div', { className: 'lp-stat' })
    item.appendChild(el('span', { className: 'lp-stat-value' }, val))
    item.appendChild(el('span', { className: 'lp-stat-label' }, label))
    item.appendChild(el('span', { className: 'lp-stat-sub' }, sub))
    stats.appendChild(item)
  })
  root.appendChild(stats)

  // =========================================================
  // FEATURES
  // =========================================================
  const features = el('section', { className: 'lp-features' })
  const featHeader = el('div', { className: 'lp-section-header' })
  featHeader.appendChild(el('p', { className: 'lp-section-kicker' }, 'Why FaceLipa'))
  featHeader.appendChild(el('h2', { className: 'lp-section-title' }, 'Built for the fast lane'))
  features.appendChild(featHeader)

  const featureGrid = el('div', { className: 'lp-feature-grid' })
  const featureList = [
    {
      icon: ICONS.zap,
      title: 'Instant Checkout',
      desc: 'No card readers, no QR codes. One face scan ends the transaction.',
      anim: 'flash',
    },
    {
      icon: ICONS.shield,
      title: 'Military-Grade Security',
      desc: '128-dimensional embeddings with liveness detection. Unspoofable.',
      anim: 'lock',
    },
    {
      icon: ICONS.smartphone,
      title: 'Mobile Money Native',
      desc: 'M-Pesa, Airtel, Halopesa, Mixx. All networks. One platform.',
      anim: 'phone',
    },
    {
      icon: ICONS.trendingUp,
      title: 'Higher Revenue',
      desc: 'Faster checkout = shorter queues = more throughput per hour.',
      anim: 'chart',
    },
  ]

  featureList.forEach(f => {
    const card = el('div', { className: 'lp-feature-card' })

    // Animated graphic area
    const graphic = el('div', { className: `lp-feat-graphic lp-feat-${f.anim}` })
    buildFeatureAnim(graphic, f.anim)
    card.appendChild(graphic)

    const body = el('div', { className: 'lp-feat-body' })
    const iconEl = el('div', { className: 'lp-feat-icon' })
    iconEl.innerHTML = f.icon
    body.appendChild(iconEl)
    body.appendChild(el('h3', { className: 'lp-feat-title' }, f.title))
    body.appendChild(el('p', { className: 'lp-feat-desc' }, f.desc))
    card.appendChild(body)

    featureGrid.appendChild(card)
  })
  features.appendChild(featureGrid)
  root.appendChild(features)

  // =========================================================
  // HOW IT WORKS
  // =========================================================
  const how = el('section', { className: 'lp-how' })
  const howInner = el('div', { className: 'lp-how-inner' })
  const howHeader = el('div', { className: 'lp-section-header' })
  howHeader.appendChild(el('p', { className: 'lp-section-kicker' }, 'The flow'))
  howHeader.appendChild(el('h2', { className: 'lp-section-title' }, 'Three steps. Done.'))
  howInner.appendChild(howHeader)

  const stepList = [
    { icon: ICONS.userPlus, num: '01', title: 'Enroll once', desc: 'Scan your face and link your mobile money account. 30 seconds.' },
    { icon: ICONS.scanFace, num: '02', title: 'Shop anywhere', desc: 'Walk up to any FaceLipa terminal, look at the camera.' },
    { icon: ICONS.checkCircle, num: '03', title: 'Confirmed', desc: 'Payment fires instantly. Receipt to your phone.' },
  ]
  const stepsEl = el('div', { className: 'lp-steps' })
  stepList.forEach(s => {
    const step = el('div', { className: 'lp-step' })
    const stepNum = el('div', { className: 'lp-step-num' }, s.num)
    const stepIcon = el('div', { className: 'lp-step-icon' })
    stepIcon.innerHTML = s.icon
    const stepBody = el('div', { className: 'lp-step-body' })
    stepBody.appendChild(el('h3', { className: 'lp-step-title' }, s.title))
    stepBody.appendChild(el('p', { className: 'lp-step-desc' }, s.desc))
    step.appendChild(stepNum)
    step.appendChild(stepIcon)
    step.appendChild(stepBody)
    stepsEl.appendChild(step)
  })
  howInner.appendChild(stepsEl)
  how.appendChild(howInner)
  root.appendChild(how)

  // =========================================================
  // CTA
  // =========================================================
  const cta = el('section', { className: 'lp-cta' })
  const ctaInner = el('div', { className: 'lp-cta-inner' })
  // Abstract grid pattern overlay
  const ctaGrid = el('div', { className: 'lp-cta-grid' })
  ctaInner.appendChild(ctaGrid)
  const ctaContent = el('div', { className: 'lp-cta-content' })
  ctaContent.appendChild(el('h2', { className: 'lp-cta-title' }, 'Ready to pay with your face?'))
  ctaContent.appendChild(el('p', { className: 'lp-cta-desc' }, 'Free for customers. Zero hardware for merchants. Tanzania-first.'))
  const ctaBtns = el('div', { className: 'lp-cta-btns' })
  const b1 = el('button', { className: 'lp-btn lp-btn-dark lp-btn-lg' }, 'Customer Portal')
  const b2 = el('button', { className: 'lp-btn lp-btn-outline-dark lp-btn-lg' }, 'Merchant Portal')
  b1.onclick = () => onNavigate('/login')
  b2.onclick = () => onNavigate('/merchant-login')
  ctaBtns.appendChild(b1)
  ctaBtns.appendChild(b2)
  ctaContent.appendChild(ctaBtns)
  ctaInner.appendChild(ctaContent)
  cta.appendChild(ctaInner)
  root.appendChild(cta)

  // =========================================================
  // FOOTER
  // =========================================================
  const footer = el('footer', { className: 'lp-footer' })
  const fLogo = el('div', { className: 'lp-footer-logo' })
  fLogo.innerHTML = LOGO_SVG + '<span>FaceLipa</span>'
  footer.appendChild(fLogo)
  footer.appendChild(el('p', { className: 'lp-footer-tag' }, '© 2026 FaceLipa · Biometric payments · Tanzania'))
  root.appendChild(footer)

  // =========================================================
  // SCROLL REVEAL — snap in cleanly
  // =========================================================
  setTimeout(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('is-visible')),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    root.querySelectorAll('.reveal').forEach(el => observer.observe(el))

    // Hero is always visible
    root.querySelectorAll('.lp-hero *, .lp-nav').forEach(el => el.classList.add('is-visible'))
  }, 0)

  return root
}

// =========================================================
// Feature animation builder (pure DOM + CSS)
// =========================================================
function buildFeatureAnim(graphic: HTMLElement, type: string) {
  if (type === 'flash') {
    // Lightning bolt with timing lines
    const bolt = el('div', { className: 'fa-bolt' })
    bolt.innerHTML = ICONS.zap
    graphic.appendChild(bolt)
    for (let i = 0; i < 4; i++) {
      const line = el('div', { className: 'fa-line' })
      line.style.setProperty('--i', String(i))
      graphic.appendChild(line)
    }
  } else if (type === 'lock') {
    const lockWrap = el('div', { className: 'fa-lock-wrap' })
    lockWrap.appendChild(el('div', { className: 'fa-lock-shackle' }))
    lockWrap.appendChild(el('div', { className: 'fa-lock-body' }))
    const keyhole = el('div', { className: 'fa-lock-keyhole' })
    lockWrap.appendChild(keyhole)
    graphic.appendChild(lockWrap)
  } else if (type === 'phone') {
    const phone = el('div', { className: 'fa-phone' })
    phone.appendChild(el('div', { className: 'fa-phone-screen' }))
    for (let i = 0; i < 3; i++) {
      const row = el('div', { className: 'fa-phone-row' })
      row.style.setProperty('--i', String(i))
      phone.appendChild(row)
    }
    graphic.appendChild(phone)
  } else if (type === 'chart') {
    const chart = el('div', { className: 'fa-chart' })
    const heights = [30, 55, 40, 80, 60, 95]
    heights.forEach((h, i) => {
      const bar = el('div', { className: 'fa-bar' })
      bar.style.setProperty('--h', `${h}%`)
      bar.style.setProperty('--i', String(i))
      chart.appendChild(bar)
    })
    graphic.appendChild(chart)
  }
}
