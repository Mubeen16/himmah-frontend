/** ISO date yyyy-mm-dd → "sunday, 13 april" */
export function formatLongDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  const date = new Date(y, m - 1, d)
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(date)
    .toLowerCase()
}
