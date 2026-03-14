/** Create element with optional children and attributes */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | boolean>,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (typeof v === 'boolean') {
        if (v) (e as Record<string, unknown>)[k] = true
      } else if (k === 'className') {
        e.className = v
      } else if (k === 'html') {
        e.innerHTML = v
      } else {
        e.setAttribute(k, v)
      }
    }
  }
  for (const c of children) {
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  return e as HTMLElementTagNameMap[K]
}

export function mount(container: HTMLElement, view: HTMLElement): void {
  container.innerHTML = ''
  container.appendChild(view)
}
