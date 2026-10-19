import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { cleanUp, eventData } from './helpers'

let payload: Payload
const created: number[] = []

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})
afterAll(() => cleanUp(payload, created))

describe('table plan on events', () => {
  it('publishing stores the tables the plan describes', async () => {
    const event = await payload.create({
      collection: 'events',
      data: eventData({ tablePlan: [{ shape: 'long', count: 2, seats: 10 }] }),
    })
    created.push(event.id)
    expect(event.tables?.map((t) => t.number)).toEqual([1, 2])
    expect(event.highestTableNumber).toBe(2)
  })

  it('a draft save leaves the published tables alone until it is published', async () => {
    const event = await payload.create({
      collection: 'events',
      data: eventData({ tablePlan: [{ shape: 'long', count: 2, seats: 10 }] }),
    })
    created.push(event.id)

    await payload.update({
      collection: 'events',
      id: event.id,
      draft: true,
      data: { tablePlan: [{ shape: 'long', count: 1, seats: 10 }], _status: 'draft' },
    })
    const published = await payload.findByID({ collection: 'events', id: event.id })
    expect(published.tables?.map((t) => t.number)).toEqual([1, 2])

    const republished = await payload.update({
      collection: 'events',
      id: event.id,
      data: { tablePlan: [{ shape: 'long', count: 1, seats: 10 }], _status: 'published' },
    })
    expect(republished.tables?.map((t) => t.number)).toEqual([1])
  })
})
