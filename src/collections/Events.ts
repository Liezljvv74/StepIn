import type { CollectionConfig, FieldHook } from 'payload'
import { slugify } from 'payload/shared'

import { TIME_ZONE } from '@/lib/format'
import { DEFAULT_SEATS } from '@/lib/seating'
import { EUROS } from './euros'
import { reconcileEventTables, unseatDroppedTables } from './hooks/reconcileEventTables'
import { repeatEvent } from './hooks/repeatEvent'

// "Mandjiedans" on 31 Oct 2026 → "mandjiedans-2026-10-31", so repeat dates of the
// same event get their own address. A slug that already ends in the date is kept.
const slugWithDate = ({ data, valueToSlugify }: { data: { date?: string }; valueToSlugify?: string }) => {
  const base = slugify(valueToSlugify)
  if (!base || !data.date) return base
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(data.date))
  return base.endsWith(day) ? base : `${base}-${day}`
}

// The slug follows the name and date on every save, until someone types their
// own: a slug that differs from what was generated before is theirs and is kept.
const autoSlug: FieldHook = ({ value, data, originalDoc }) => {
  const generate = (doc?: { name?: string; date?: string }) =>
    slugWithDate({ data: { date: doc?.date }, valueToSlugify: doc?.name })
  const slug = value ?? originalDoc?.slug
  const wasGenerated = !originalDoc || originalDoc.slug === generate(originalDoc)
  const typedNow = originalDoc && slug !== originalDoc.slug
  if (!slug || (wasGenerated && !typedNow)) {
    return generate({ name: data?.name ?? originalDoc?.name, date: data?.date ?? originalDoc?.date })
  }
  return slugify(slug)
}

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'date', 'venue', '_status'],
  },
  // Replaced by the Repeat fields, which copy an event onto later dates.
  disableDuplicate: true,
  access: {
    // The public sees published events only; logged-in admins see drafts too.
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    beforeChange: [reconcileEventTables],
    afterChange: [unseatDroppedTables, repeatEvent],
    // An event's bookings go with it; its orders stay, keeping the event's name.
    beforeDelete: [
      async ({ id, req }) => {
        await req.payload.delete({ collection: 'bookings', where: { event: { equals: id } }, req })
      },
    ],
  },
  versions: {
    drafts: true,
    maxPerDoc: 10,
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true, admin: { rows: 3 } },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description:
          'The web address, made from the name and date when you save. Type your own to change it; leave empty to go back to the generated one.',
      },
      hooks: { beforeValidate: [autoSlug] },
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      index: true, // home page and clean-up filter on it
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'venue', type: 'text', required: true, admin: { position: 'sidebar' } },
    // Not stored: acted on once when the event is saved (hooks/repeatEvent.ts).
    {
      name: 'repeatTimes',
      label: 'Repeat: number of times',
      type: 'number',
      virtual: true,
      min: 1,
      max: 52,
      admin: {
        position: 'sidebar',
        description: 'When you save, this many more copies of the event are made on later dates. Leave empty for none.',
      },
    },
    {
      name: 'repeatEvery',
      label: 'Repeat every',
      type: 'select',
      virtual: true,
      defaultValue: 'weekly',
      options: [
        { label: 'Day', value: 'daily' },
        { label: 'Week', value: 'weekly' },
        { label: 'Month', value: 'monthly' },
      ],
      admin: { position: 'sidebar', condition: (data) => Boolean(data?.repeatTimes) },
    },
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
              admin: { width: '40%', components: EUROS },
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
      // Made from the table plan when the event is published; seating uses it.
      // Hidden: it only repeats the plan.
      admin: { hidden: true },
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
