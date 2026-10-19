import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'
import { slugify } from 'payload/shared'

import { TIME_ZONE } from '@/lib/format'

// "Mandjiedans" on 31 Oct 2026 → "mandjiedans-2026-10-31", so repeat dates of the
// same event get their own address. A slug that already ends in the date is kept.
const slugWithDate = ({ data, valueToSlugify }: { data: { date?: string }; valueToSlugify?: string }) => {
  const base = slugify(valueToSlugify)
  if (!base || !data.date) return base
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(data.date))
  return base.endsWith(day) ? base : `${base}-${day}`
}

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'date', 'venue', '_status'],
  },
  access: {
    // The public sees published events only; logged-in admins see drafts too.
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  versions: {
    drafts: true,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField({ useAsSlug: 'name', slugify: slugWithDate }),
    { name: 'description', type: 'textarea', required: true },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'venue', type: 'text', required: true, admin: { position: 'sidebar' } },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'ticketTypes',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'price',
          type: 'number',
          required: true,
          // Stripe rejects card charges below about 50 cents.
          min: 50,
          admin: { description: 'In cents: 2500 means 25.00' },
          validate: (value: number | null | undefined) =>
            Number.isInteger(value) || 'Price must be a whole number of cents',
        },
      ],
    },
  ],
}
