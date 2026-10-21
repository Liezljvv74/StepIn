import { slugify } from 'payload/shared'

import { TIME_ZONE } from './format'

// "Mandjiedans" on 31 Oct 2026 → "mandjiedans-2026-10-31", so repeat dates of the
// same event get their own address. A slug that already ends in the date is kept.
// Used on save (collections/Events.ts) and while typing (components/Slug.tsx).
export const slugWithDate = ({ data, valueToSlugify }: { data: { date?: string }; valueToSlugify?: string }) => {
  const base = slugify(valueToSlugify)
  if (!base || !data.date) return base
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(data.date))
  return base.endsWith(day) ? base : `${base}-${day}`
}
