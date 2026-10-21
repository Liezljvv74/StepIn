import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Event } from '@/payload-types'
import { reserveSeats, SOLD_OUT_MESSAGE } from '@/lib/reserve-seats'
import { cleanUp, eventData } from './helpers'

let payload: Payload
const created: number[] = []

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})
afterAll(() => cleanUp(payload, created))

async function makeEvent(overrides: Partial<Event> = {}) {
  const event = await payload.create({
    collection: 'events',
    data: eventData({ tablePlan: [{ shape: 'long', count: 1, seats: 10 }], ...overrides }),
  })
  created.push(event.id)
  return event
}

const ticket = (event: Event, name: string) => event.ticketTypes.find((t) => t.name === name)!.id!

describe('reserveSeats', () => {
  it('holds the seats on a pending order priced from Payload', async () => {
    const event = await makeEvent()
    const order = await reserveSeats(payload, {
      eventId: event.id,
      guests: [
        { name: 'Ann', ticketTypeId: ticket(event, 'Standard') },
        { name: 'Bob', ticketTypeId: ticket(event, 'VIP') },
        { name: 'Cat', ticketTypeId: ticket(event, 'VIP') },
      ],
    })
    expect(order.status).toBe('pending')
    expect(order.amount).toBe(1000 + 2500 + 2500)
    expect(order.quantity).toBe(3)
    expect(order.guests?.map((g) => [g.name, g.ticketType, g.price])).toEqual([
      ['Ann', 'Standard', 1000],
      ['Bob', 'VIP', 2500],
      ['Cat', 'VIP', 2500],
    ])
    expect(order.eventName).toBe(event.name)
    expect(order.eventDate).toBe(event.date)
    const holdMinutes = (new Date(order.holdUntil!).getTime() - Date.now()) / 60000
    expect(holdMinutes).toBeGreaterThan(30)
    expect(holdMinutes).toBeLessThanOrEqual(31)
  })

  it('refuses tampered or impossible requests', async () => {
    const event = await makeEvent()
    const std = ticket(event, 'Standard')
    const guest = { name: 'Ann', ticketTypeId: std }
    const refused = (input: Parameters<typeof reserveSeats>[1]) =>
      expect(reserveSeats(payload, input)).rejects.toThrow()

    await refused({ eventId: event.id, guests: Array(11).fill(guest) })
    await refused({ eventId: event.id, guests: [] })
    await refused({ eventId: event.id, guests: [{ name: '  ', ticketTypeId: std }] })
    await refused({ eventId: event.id, guests: [{ name: 'Ann', ticketTypeId: 'not-a-ticket' }] })
    await refused({ eventId: Number.NaN, guests: [guest] })

    const draft = await makeEvent({ _status: 'draft' })
    await refused({ eventId: draft.id, guests: [{ name: 'Ann', ticketTypeId: ticket(draft, 'Standard') }] })

    const past = await makeEvent({ date: new Date(Date.now() - 86400000).toISOString() })
    await refused({ eventId: past.id, guests: [{ name: 'Ann', ticketTypeId: ticket(past, 'Standard') }] })

    const orders = await payload.count({
      collection: 'orders',
      where: { event: { in: [event.id, draft.id, past.id] } },
    })
    expect(orders.totalDocs).toBe(0)
  })

  it('takes a large party when the room has the seats', async () => {
    const event = await makeEvent({ tablePlan: [{ shape: 'round', count: 3, seats: 10 }] })
    const std = ticket(event, 'Standard')
    const order = await reserveSeats(payload, {
      eventId: event.id,
      guests: Array.from({ length: 25 }, (_, i) => ({ name: `Guest ${i + 1}`, ticketTypeId: std })),
    })
    expect(order.quantity).toBe(25)
  })

  it('refuses more guests than seats left', async () => {
    const event = await makeEvent({ tablePlan: [{ shape: 'long', count: 1, seats: 2 }] })
    const std = ticket(event, 'Standard')
    await expect(
      reserveSeats(payload, {
        eventId: event.id,
        guests: ['A', 'B', 'C'].map((name) => ({ name, ticketTypeId: std })),
      }),
    ).rejects.toThrow(SOLD_OUT_MESSAGE)
  })

  it('lets only one of two simultaneous buyers take the last seats', async () => {
    const event = await makeEvent({ tablePlan: [{ shape: 'long', count: 1, seats: 2 }] })
    const std = ticket(event, 'Standard')
    const buy = (who: string) =>
      reserveSeats(payload, {
        eventId: event.id,
        guests: [`${who}1`, `${who}2`].map((name) => ({ name, ticketTypeId: std })),
      })
    const results = await Promise.allSettled([buy('A'), buy('B')])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  })
})
