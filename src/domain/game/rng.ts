// PRNG déterministe (mulberry32). Retourne un float dans [0, 1).
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomInt(rng: () => number, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive)
}

// Tire n éléments distincts sans muter l'entrée (Fisher-Yates partiel sur une copie).
export function pickN<T>(rng: () => number, items: T[], n: number): T[] {
  const copy = [...items]
  const out: T[] = []
  const k = Math.min(n, copy.length)
  for (let i = 0; i < k; i++) {
    const idx = randomInt(rng, copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}

// Tirage de Poisson (algorithme de Knuth).
export function poisson(rng: () => number, lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}
