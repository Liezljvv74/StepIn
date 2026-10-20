import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'

let payload: Payload
const created: number[] = []

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})
afterAll(() => payload.delete({ collection: 'faqs', where: { id: { in: created } } }))

describe('FAQs', () => {
  it('the public sees published questions only', async () => {
    const tag = `Test ${Date.now()}`
    const published = await payload.create({
      collection: 'faqs',
      data: { question: `${tag} published?`, answer: 'Yes.', _status: 'published' },
    })
    const draft = await payload.create({
      collection: 'faqs',
      draft: true,
      data: { question: `${tag} draft?`, answer: 'Not yet.' },
    })
    created.push(published.id, draft.id)

    const { docs } = await payload.find({
      collection: 'faqs',
      where: { question: { like: tag } },
      overrideAccess: false,
    })
    expect(docs.map((d) => d.id)).toEqual([published.id])
  })
})
