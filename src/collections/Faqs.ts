import type { CollectionConfig } from 'payload'

// Questions on the public /faq page. Staff drag rows in the list to set the order.
export const Faqs: CollectionConfig = {
  slug: 'faqs',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  orderable: true,
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', '_status', 'updatedAt'],
  },
  versions: {
    drafts: true,
  },
  access: {
    // The public sees published questions only; logged-in staff see drafts too.
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'question', type: 'text', required: true },
    { name: 'answer', type: 'textarea', required: true, admin: { rows: 5 } },
  ],
}
