import type { CollectionConfig } from 'payload'

import { EUROS } from './euros'
import { createBookingFromOrder } from './hooks/createBookingFromOrder'

// Orders are written by the server (checkout action and Stripe webhook) through
// the Local API, which skips these rules. Over HTTP only admins get in.
const loggedIn = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['event', 'ticketType', 'quantity', 'amount', 'email', 'status', 'createdAt'],
  },
  access: {
    read: loggedIn,
    create: loggedIn,
    update: loggedIn,
    delete: loggedIn,
  },
  hooks: {
    afterChange: [createBookingFromOrder],
    // Deleting an order (e.g. an erasure request) also deletes its booking, so
    // the guests' names and phone don't stay behind.
    afterDelete: [
      async ({ doc, id, req }) => {
        if (doc.status !== 'paid') return // only a paid order has a booking
        await req.payload.delete({ collection: 'bookings', where: { order: { equals: id } }, req })
      },
    ],
  },
  fields: [
    // Not required: an order outlives its event (deleting an event keeps its
    // orders), so it also keeps the event's name and date.
    { name: 'event', type: 'relationship', relationTo: 'events' },
    { name: 'eventName', type: 'text' },
    { name: 'eventDate', type: 'date' },
    { name: 'ticketType', type: 'text', required: true },
    { name: 'quantity', type: 'number', required: true, min: 1 },
    { name: 'amount', label: 'Amount (€)', type: 'number', required: true, admin: { components: EUROS } },
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    {
      name: 'guests',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'ticketType', type: 'text' },
            { name: 'price', label: 'Price (€)', type: 'number', admin: { components: EUROS } },
          ],
        },
      ],
    },
    {
      name: 'holdUntil',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        description: 'A pending order holds its seats until then (the Stripe session expires at the same time).',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    { name: 'stripeSessionId', type: 'text', unique: true, index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: ['pending', 'paid'],
      admin: { position: 'sidebar' },
    },
  ],
}
