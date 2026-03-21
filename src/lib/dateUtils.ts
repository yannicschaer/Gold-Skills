export type TimeRange = '3m' | '6m' | 'all'

export function getCutoffDate(range: TimeRange): string | undefined {
  if (range === 'all') return undefined
  const d = new Date()
  d.setMonth(d.getMonth() - (range === '3m' ? 3 : 6))
  return d.toISOString().slice(0, 10) // "YYYY-MM-DD"
}
