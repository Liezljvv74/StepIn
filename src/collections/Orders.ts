import type { CollectionConfig } from 'payload'

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
  },
  fields: [
    // Not required: an order outlives its event (the clean-up deletes events but
    // keeps orders), so it also keeps the event's name and date.
    { name: 'event', type: 'relationship', relationTo: 'events' },
    { name: 'eventName', type: 'text' },
    { name: 'eventDate', type: 'date' },
    { name: 'ticketType', type: 'text', required: true },
    { name: 'quantity', type: 'number', required: true, min: 1 },
    { name: 'amount', type: 'number', required: true, admin: { description: 'Total in cents' } },
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
            { name: 'price', type: 'number', admin: { description: 'Cents' } },
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
