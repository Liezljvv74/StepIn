import type { CollectionConfig } from 'payload'
import { slugField } from 'payload'
import { slugify } from 'payload/shared'

import { TIME_ZONE } from '@/lib/format'
import { DEFAULT_SEATS } from '@/lib/seating'
import { reconcileEventTables, unseatDroppedTables } from './hooks/reconcileEventTables'

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
  hooks: {
    beforeChange: [reconcileEventTables],
    afterChange: [unseatDroppedTables],
    // An event's bookings go with it; its orders stay, keeping the event's name.
    beforeDelete: [
      async ({ id, req }) => {
        await req.payload.delete({ collection: 'bookings', where: { event: { equals: id } }, req })
      },
    ],
  },
  versions: {
    drafts: true,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField({ useAsSlug: 'name', slugify: slugWithDate }),
    { name: 'description', type: 'textarea', required: true, admin: { rows: 3 } },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'venue', type: 'text', required: true, admin: { position: 'sidebar' } },
    { name: 'image', type: 'upload', relationTo: 'media', admin: { position: 'sidebar' } },
    {
      name: 'ticketTypes',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', required: true, admin: { width: '60%' } },
            {
              name: 'price',
              type: 'number',
              required: true,
              // Stripe rejects card charges below about 50 cents.
              min: 50,
              label: 'Price (€)',
              admin: { width: '40%', components: { Cell: '/components/Euros#EurosCell', Field: '/components/Euros#EurosField' } },
              // A custom validate replaces Payload's own min check, so it repeats it.
              validate: (value: number | null | undefined) =>
                (Number.isInteger(value) && value! >= 50) ||
                'Price must be at least 0.50',
            },
          ],
        },
      ],
    },
    {
      name: 'tablePlan',
      type: 'array',
      labels: { singular: 'Table line', plural: 'Table plan' },
      admin: {
        description:
          'How the room is laid out: one line per kind of table. Line one takes the low table numbers. No lines means the room is not laid out yet (no seat limit).',
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'shape',
              type: 'select',
              required: true,
              defaultValue: 'long',
              options: ['long', 'round', 'square'],
              admin: { width: '34%' },
            },
            {
              name: 'count',
              label: 'Number of tables',
              type: 'number',
              required: true,
              min: 0,
              max: 200,
              admin: { width: '33%' },
            },
            {
              name: 'seats',
              label: 'Seats per table',
              type: 'number',
              required: true,
              min: 1,
              max: 100,
              defaultValue: DEFAULT_SEATS,
              admin: { width: '33%' },
            },
          ],
        },
      ],
    },
    {
      name: 'confirmTableChanges',
      label: 'Confirm: remove tables where guests are seated',
      type: 'checkbox',
      virtual: true,
    },
    {
      name: 'tables',
      type: 'array',
      admin: {
        readOnly: true,
        initCollapsed: true,
        description: 'Made from the table plan when the event is published.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'number', type: 'number', required: true },
            { name: 'seats', type: 'number', required: true },
            { name: 'shape', type: 'select', options: ['long', 'round', 'square'] },
          ],
        },
      ],
    },
    {
      name: 'highestTableNumber',
      type: 'number',
      defaultValue: 0,
      admin: { hidden: true },
    },
  ],
}
