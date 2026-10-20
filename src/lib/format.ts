// ponytail: one currency and time zone for the whole site; make them fields on Events if events ever differ.
export const CURRENCY = 'eur'
export const TIME_ZONE = 'Europe/Berlin'

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat('en', { style: 'currency', currency: CURRENCY }).format(cents / 100)

// Admin price fields: 30010 ↔ "300.10". A comma is accepted ("300,10").
export const toEuros = (cents: unknown) => (typeof cents === 'number' ? (cents / 100).toFixed(2) : '')
export const toCents = (text: string) => {
  const trimmed = text.trim().replace(',', '.')
  return trimmed === '' ? null : Math.round(Number(trimmed) * 100) // NaN fails the field's validation
}

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  }).format(new Date(iso))
