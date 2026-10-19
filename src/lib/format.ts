// ponytail: one currency and time zone for the whole site; make them fields on Events if events ever differ.
export const CURRENCY = 'eur'
export const TIME_ZONE = 'Europe/Berlin'

export const formatPrice = (cents: number) =>
  new Intl.NumberFormat('en', { style: 'currency', currency: CURRENCY }).format(cents / 100)

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
