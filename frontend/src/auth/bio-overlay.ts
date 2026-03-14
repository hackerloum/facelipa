import './bio-overlay.css'

export interface BioOverlayResult {
  userId: string
}

// 128-d random embedding (demo — no real processing)
function fakeDemoEmbedding(): number[] {
  return Array.from({ length: 128 }, () => (Math.random() * 2 - 1) * 0.3)
}

function fakeUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

// Landmark dot positions — approximate face anatomy percentages
const LANDMARK_POSITIONS = [
  // jaw line
  [15, 88], [20, 82], [25, 76], [30, 71], [38, 68], [46, 66], [54, 66],
  [62, 68], [71, 71], [77, 76], [82, 82], [85, 88],
  // brow left
  [24, 36], [30, 32], [37, 31], [44, 32],
  // brow right
  [56, 32], [63, 31], [70, 32], [76, 36],
  // nose bridge
  [50, 38], [50, 44], [50, 50],
  // nose base
  [43, 58], [50, 60], [57, 58],
  // left eye
  [28, 42], [33, 39], [39, 39], [44, 42], [39, 45], [33, 45],
  // right eye
  [56, 42], [61, 39], [67, 39], [72, 42], [67, 45], [61, 45],
  // mouth outer
  [38, 70], [44, 68], [50, 69], [56, 68], [62, 70],
  [56, 76], [50, 78], [44, 76],
  // mouth inner
  [43, 71], [50, 72], [57, 71], [50, 76],
]

const STEPS = [
  { label: 'Detecting face region', duration: 900 },
  { label: 'Mapping 68 landmark points', duration: 1100 },
  { label: 'Extracting biometric vector', duration: 1200 },
  { label: 'AES-256 encrypting embedding', duration: 700 },
  { label: 'Registering on secure ledger', duration: 900 },
]

export function showBioOverlay(
  faceImageSrc: string,
  _firstName: string,
  onComplete: (userId: string, embedding: number[]) => void
): void {
  const overlay = document.createElement('div')
  overlay.className = 'bio-overlay'

  /* ── Scan frame ─────────────────────────────────── */
  const frame = document.createElement('div')
  frame.className = 'bio-frame'

  const faceImg = document.createElement('img')
  faceImg.className = 'bio-face-img'
  faceImg.src = faceImageSrc
  frame.appendChild(faceImg)

  ;['tl','tr','bl','br'].forEach(c => {
    const corner = document.createElement('div')
    corner.className = `bio-corner ${c}`
    frame.appendChild(corner)
  })

  const scanLine = document.createElement('div')
  scanLine.className = 'bio-scan-line'
  frame.appendChild(scanLine)

  // Mesh SVG
  const mesh = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  mesh.setAttribute('class', 'bio-mesh')
  mesh.setAttribute('viewBox', '0 0 100 100')
  mesh.setAttribute('preserveAspectRatio', 'none')
  frame.appendChild(mesh)

  // HUD panels
  const hudLeft = document.createElement('div')
  hudLeft.className = 'bio-hud left'
  hudLeft.innerHTML = `
    <span>CONF: 99.8%</span>
    <span>MATCH: LIVE</span>
    <span>LIVENESS: OK</span>
    <span>PTS: 68</span>
    <span>ENC: AES-256</span>
  `
  const hudRight = document.createElement('div')
  hudRight.className = 'bio-hud right'
  hudRight.innerHTML = `
    <span>NET: MBNET-V1</span>
    <span>RES: 224×224</span>
    <span>DIM: 128-D</span>
    <span>THR: 0.42</span>
    <span>DIST: L²</span>
  `
  frame.appendChild(hudLeft)
  frame.appendChild(hudRight)

  overlay.appendChild(frame)

  /* ── Step list ───────────────────────────────────── */
  const stepsEl = document.createElement('div')
  stepsEl.className = 'bio-steps'
  STEPS.forEach((s, i) => {
    const step = document.createElement('div')
    step.className = 'bio-step'
    step.id = `bio-step-${i}`
    step.innerHTML = `<div class="bio-step-icon">◌</div><span>${s.label}</span>`
    stepsEl.appendChild(step)
  })
  overlay.appendChild(stepsEl)

  /* ── Progress bar ──────────────────────────────────── */
  const progressBar = document.createElement('div')
  progressBar.className = 'bio-progress-bar'
  const progressFill = document.createElement('div')
  progressFill.className = 'bio-progress-fill'
  progressBar.appendChild(progressFill)
  overlay.appendChild(progressBar)

  /* ── Status text ───────────────────────────────────── */
  const statusText = document.createElement('div')
  statusText.className = 'bio-status-text'
  statusText.textContent = 'INITIALISING BIOMETRIC ENGINE...'
  overlay.appendChild(statusText)

  /* ── Success state ─────────────────────────────────── */
  const successEl = document.createElement('div')
  successEl.className = 'bio-success'
  successEl.innerHTML = `
    <div class="bio-check">✓</div>
    <div class="bio-success-title">Identity Verified</div>
    <div class="bio-uid" id="bio-uid-text">Generating ID...</div>
  `
  overlay.appendChild(successEl)

  document.body.appendChild(overlay)

  /* ── Animation sequence ────────────────────────────── */
  let elapsed = 0
  const totalDuration = STEPS.reduce((s, x) => s + x.duration, 0)

  const dotTimers: ReturnType<typeof setTimeout>[] = []

  // Phase 1: scatter landmark dots
  function scatterDots(startDelay: number) {
    LANDMARK_POSITIONS.forEach(([px, py], i) => {
      dotTimers.push(setTimeout(() => {
        const dot = document.createElement('div')
        dot.className = 'bio-dot'
        dot.style.left = `${px}%`
        dot.style.top = `${py}%`
        dot.style.animationDelay = '0s'
        frame.appendChild(dot)

        // After all dots placed, draw mesh lines
        if (i === LANDMARK_POSITIONS.length - 1) {
          setTimeout(() => {
            mesh.classList.add('visible')
            drawMeshLines(mesh)
          }, 200)
        }
      }, startDelay + i * 24))
    })
  }

  function drawMeshLines(svg: SVGSVGElement) {
    const connections = [
      [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11], // jaw
      [12,13],[13,14],[14,15], // brow L
      [16,17],[17,18],[18,19], // brow R
      [28,29],[29,30],[30,31],[32,33],[32,34], // eyes L
      [35,36],[36,37],[37,38],[38,40],[36,41], // eyes R
      [20,21],[22,23], // nose
      [42,43],[43,44],[44,45],[45,46],[46,47],[47,48],[48,49],[49,42], // mouth
    ]
    connections.forEach(([a, b]) => {
      if (a >= LANDMARK_POSITIONS.length || b >= LANDMARK_POSITIONS.length) return
      const [x1, y1] = LANDMARK_POSITIONS[a]
      const [x2, y2] = LANDMARK_POSITIONS[b]
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', String(x1)); line.setAttribute('y1', String(y1))
      line.setAttribute('x2', String(x2)); line.setAttribute('y2', String(y2))
      line.setAttribute('stroke', '#CCFF00'); line.setAttribute('stroke-width', '0.8')
      svg.appendChild(line)
    })
  }

  // Run step sequence
  async function runSteps() {
    await sleep(600) // initial pause
    statusText.textContent = 'BIOMETRIC ENGINE READY'
    await sleep(400)

    for (let i = 0; i < STEPS.length; i++) {
      const stepEl = document.getElementById(`bio-step-${i}`)!
      stepEl.className = 'bio-step active'
      stepEl.querySelector('.bio-step-icon')!.textContent = '◎'

      statusText.textContent = STEPS[i].label.toUpperCase() + '...'

      // Scatter dots during landmark phase
      if (i === 1) scatterDots(200)

      // Animate progress fill
      elapsed += STEPS[i].duration
      progressFill.style.width = `${(elapsed / totalDuration) * 100}%`

      await sleep(STEPS[i].duration)
      stepEl.className = 'bio-step done'
      stepEl.querySelector('.bio-step-icon')!.textContent = '✓'

      if (i < STEPS.length - 1) await sleep(80)
    }

    // Complete
    progressFill.style.width = '100%'
    statusText.textContent = ''
    await sleep(300)

    // Show success
    frame.style.display = 'none'
    stepsEl.style.display = 'none'
    progressBar.style.display = 'none'

    const userId = fakeUUID()
    const uidEl = overlay.querySelector('#bio-uid-text')!
    uidEl.textContent = `USER ID: ${userId}`
    successEl.classList.add('show')

    await sleep(1800)

    // Fade out and call back
    overlay.style.transition = 'opacity 0.4s'
    overlay.style.opacity = '0'
    await sleep(400)
    overlay.remove()
    dotTimers.forEach(clearTimeout)
    onComplete(userId, fakeDemoEmbedding())
  }

  runSteps()
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}
