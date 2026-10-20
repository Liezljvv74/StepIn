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

// eventData without its fixed slug, so the slug is generated.
const unslugged = (name: string, date: string) => {
  const { slug: _slug, ...data } = eventData({ name, date })
  return data
}

describe('slug', () => {
  it('is made from the name and date, and follows them until someone types their own', async () => {
    const name = `Slug test ${Date.now()}`
    const event = await payload.create({ collection: 'events', data: unslugged(name, '2027-05-01T17:30:00.000Z') })
    created.push(event.id)
    const base = name.toLowerCase().replace(/ /g, '-')
    expect(event.slug).toBe(`${base}-2027-05-01`)

    const moved = await payload.update({ collection: 'events', id: event.id, data: { date: '2027-05-08T17:30:00.000Z' } })
    expect(moved.slug).toBe(`${base}-2027-05-08`)

    const own = await payload.update({ collection: 'events', id: event.id, data: { slug: `${base}-My Own` } })
    expect(own.slug).toBe(`${base}-my-own`)
    const kept = await payload.update({ collection: 'events', id: event.id, data: { date: '2027-05-15T17:30:00.000Z' } })
    expect(kept.slug).toBe(`${base}-my-own`)
  })
})

describe('repeat', () => {
  it('copies the event onto later dates with the same tickets, plan and status', async () => {
    const name = `Repeat test ${Date.now()}`
    const event = await payload.create({
      collection: 'events',
      data: {
        ...unslugged(name, '2027-05-01T17:30:00.000Z'),
        tablePlan: [{ shape: 'round', count: 2, seats: 8 }],
        repeatTimes: 2,
        repeatEvery: 'weekly',
      },
    })
    const { docs: copies } = await payload.find({
      collection: 'events',
      where: { and: [{ name: { equals: name } }, { id: { not_equals: event.id } }] },
      sort: 'date',
      depth: 0,
    })
    created.push(event.id, ...copies.map((c) => c.id))

    expect(copies.map((c) => c.date)).toEqual(['2027-05-08T17:30:00.000Z', '2027-05-15T17:30:00.000Z'])
    for (const copy of copies) {
      expect(copy._status).toBe('published')
      expect(copy.ticketTypes.map((t) => [t.name, t.price])).toEqual([['Standard', 1000], ['VIP', 2500]])
      expect(copy.tables?.map((t) => t.seats)).toEqual([8, 8])
      expect(copy.slug).toMatch(/-2027-05-(08|15)$/)
    }
  })
})
