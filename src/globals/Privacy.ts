import type { GlobalConfig } from 'payload'

// The public /privacy page. One document, edited in /admin under Globals.
export const Privacy: GlobalConfig = {
  slug: 'privacy',
  label: 'Privacy policy',
  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user),
  },
  fields: [{ name: 'content', type: 'richText', required: true }],
}
