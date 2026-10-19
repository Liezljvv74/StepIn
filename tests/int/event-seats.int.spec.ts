import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { seatsLeft } from '@/lib/event-seats'
import { cleanUp, eventData } from './helpers'

let payload: Payload
const created: number[] = []

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})
afterAll(() => cleanUp(payload, created))

const minutes = (n: number) => new Date(Date.now() + n * 60000).toISOString()

describe('seatsLeft', () => {
  it('counts every booking, cancellations and live seat holds', async () => {
    const event = await payload.create({
      collection: 'events',
      data: eventData({ tablePlan: [{ shape: 'long', count: 2, seats: 10 }] }),
    })
    created.push(event.id)

    // More bookings than Payload's default page size of 10.
    for (let i = 0; i < 12; i++) {
      await payload.create({
        collection: 'bookings',
        data: {
          event: event.id,
          partyName: `Party ${i}`,
          telephone: '0123',
        source: 'phone',
          source: 'phone',
          guests: [{ name: `Guest ${i}`, status: 'pay_at_venue', price: 1000 }],
        },
      })
    }
    await payload.create({
      collection: 'bookings',
      data: {
        event: event.id,
        partyName: 'Gone',
        telephone: '0123',
        source: 'phone',
        guests: [{ name: 'Cancelled', status: 'cancelled', price: 1000 }],
      },
    })

    const order = (holdUntil: string) => ({
      event: event.id,
      ticketType: 'Standard',
      quantity: 2,
      amount: 2000,
      status: 'pending' as const,
      holdUntil,
      guests: [
        { name: 'A', ticketType: 'Standard', price: 1000 },
        { name: 'B', ticketType: 'Standard', price: 1000 },
      ],
    })
    await payload.create({ collection: 'orders', data: order(minutes(20)) })
    await payload.create({ collection: 'orders', data: order(minutes(-5)) })

    expect(await seatsLeft(payload, event.id)).toBe(20 - 12 - 2)
  })

  it('has no limit when the room is not laid out', async () => {
    const event = await payload.create({ collection: 'events', data: eventData() })
    created.push(event.id)
    expect(await seatsLeft(payload, event.id)).toBeNull()
  })
})
