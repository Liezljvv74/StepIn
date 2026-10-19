import type { CollectionConfig } from 'payload'

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
  fields: [
    { name: 'event', type: 'relationship', relationTo: 'events', required: true },
    { name: 'ticketType', type: 'text', required: true },
    { name: 'quantity', type: 'number', required: true, min: 1 },
    { name: 'amount', type: 'number', required: true, admin: { description: 'Total in cents' } },
    { name: 'email', type: 'email' },
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
