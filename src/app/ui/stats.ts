export function getLabeledStat(stats2025: any | null | undefined, keys: string[]) {
  const labeled = stats2025?.labeled
  if (!labeled || typeof labeled !== 'object') return null
  for (const k of keys) {
    if (k in labeled) return labeled[k]
  }
  // fuzzy contains
  const entries = Object.entries(labeled) as Array<[string, any]>
  for (const [label, val] of entries) {
    for (const k of keys) {
      if (label.toLowerCase().includes(k.toLowerCase())) return val as any
    }
  }
  return null
}

export function isPitcher(pos?: string | null) {
  const p = (pos || '').toUpperCase()
  return p === 'SP' || p === 'RP' || p === 'P'
}
