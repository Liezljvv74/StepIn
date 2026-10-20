import config from '@payload-config'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'FAQ – StepIn' }

export default async function FaqPage() {
  const payload = await getPayload({ config })
  const { docs: faqs } = await payload.find({
    collection: 'faqs',
    sort: '_order',
    pagination: false,
    select: { question: true, answer: true },
    overrideAccess: false,
  })

  return (
    <article className="faq">
      <h1>Frequently asked questions</h1>
      {faqs.length === 0 && <p>No questions yet.</p>}
      {faqs.map((faq) => (
        <details key={faq.id}>
          <summary>{faq.question}</summary>
          <p>{faq.answer}</p>
        </details>
      ))}
    </article>
  )
}
