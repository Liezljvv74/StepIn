import config from '@payload-config'
import { RichText } from '@payloadcms/richtext-lexical/react'
import Link from 'next/link'
import { getPayload } from 'payload'

import { formatDate } from '@/lib/format'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Privacy – StepIn' }

// The text is edited in /admin → Privacy policy (src/globals/Privacy.ts).
export default async function PrivacyPage() {
  const payload = await getPayload({ config })
  const privacy = await payload.findGlobal({ slug: 'privacy', overrideAccess: false })

  return (
    <article className="privacy">
      <h1>Privacy</h1>
      {privacy.updatedAt && <p>Last updated: {formatDate(privacy.updatedAt)}</p>}
      {privacy.content && <RichText data={privacy.content} />}
      <Link href="/">Back to events</Link>
    </article>
  )
}
