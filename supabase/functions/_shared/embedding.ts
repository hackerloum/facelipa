/** Parse embedding from DB (string or array) to number[] */
export function parseEmbedding(val: unknown): number[] {
  if (Array.isArray(val)) return val.map(Number)
  if (typeof val === 'string') {
    const s = val.replace(/^\[|\]$/g, '').trim()
    return s ? s.split(',').map(Number) : []
  }
  return []
}

/** Cosine similarity between two 128-d vectors */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== 128 || b.length !== 128) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < 128; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0
}
