import type { CollectionConfig } from 'payload'

import { bookingSummary } from './hooks/bookingSummary'

// Phone bookings are entered here by the owner; online ones are created when
// Stripe confirms an order. No access block: Payload's default is logged-in only.
export const Bookings: CollectionConfig = {
  slug: 'bookings',
  admin: {
    useAsTitle: 'partyName',
    defaultColumns: ['partyName', 'event', 'liveGuests', 'hasUnseated', 'buyerEmail', 'amount', 'paymentStatus'],
    listSearchableFields: ['partyName', 'telephone'],
    // Parties whose guests are all cancelled have no line, as in the old app.
    baseFilter: () => ({ fullyCancelled: { not_equals: true } }),
  },
  hooks: {
    beforeChange: [bookingSummary],
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    { name: 'partyName', type: 'text', required: true },
    {
      name: 'telephone',
      type: 'text',
      validate: (value: string | null | undefined, { siblingData }: { siblingData: { source?: string } }) =>
        siblingData.source === 'online' ||
        Boolean(value?.trim()) ||
        'A telephone number is required for a phone booking',
    },
    {
      name: 'guests',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', admin: { width: '30%' } },
            {
              name: 'status',
              type: 'select',
              required: true,
              defaultValue: 'pay_at_venue',
              options: [
                { label: 'Paid', value: 'paid' },
                { label: 'Pay at venue', value: 'pay_at_venue' },
                { label: 'Not paying', value: 'not_paying' },
                { label: 'Cancelled', value: 'cancelled' },
              ],
              admin: { width: '20%' },
            },
            { name: 'table', type: 'number', min: 1, admin: { width: '15%' } },
            { name: 'ticketType', type: 'text', admin: { width: '15%' } },
            {
              name: 'price',
              label: 'Price in cents',
              type: 'number',
              min: 0,
              admin: { width: '20%' },
              // A custom validate replaces Payload's own min check, so it repeats it.
              validate: (value: number | null | undefined) =>
                value == null ||
                (Number.isInteger(value) && value >= 0) ||
                'Price must be a whole number of cents, 0 or more',
            },
          ],
        },
      ],
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'phone',
      options: ['phone', 'online'],
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      type: 'relationship',
      relationTo: 'orders',
      unique: true,
      admin: { position: 'sidebar', readOnly: true },
    },
    // Read from the linked order (online bookings only); nothing is stored twice.
    {
      name: 'buyerEmail',
      type: 'email',
      virtual: 'order.email',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      // The order stores cents; shown here in euros (30010 → 300.1).
      name: 'amount',
      label: 'Amount (€)',
      type: 'number',
      virtual: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
        components: { Cell: '/components/Euros#EurosCell', Field: '/components/Euros#EurosField' },
      },
      hooks: {
        // ponytail: one order lookup per booking in the list; fine at this size.
        afterRead: [
          async ({ siblingData, req }) => {
            const order = siblingData.order
            if (!order) return null
            const cents =
              typeof order === 'object'
                ? order.amount
                : (await req.payload.findByID({ collection: 'orders', id: order, depth: 0, select: { amount: true }, req })).amount
            return cents / 100
          },
        ],
      },
    },
    {
      name: 'paymentStatus',
      label: 'Paid status',
      type: 'text',
      virtual: 'order.status',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'cancelBooking',
      label: 'Cancel the whole booking',
      type: 'checkbox',
      virtual: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'liveGuests',
      label: 'Guests coming',
      type: 'number',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'hasUnseated',
      label: 'Needs seating',
      type: 'checkbox',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'fullyCancelled',
      type: 'checkbox',
      index: true,
      admin: { position: 'sidebar', readOnly: true },
    },
  ],
}
