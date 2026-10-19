import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Booking } from '@/payload-types'
import { cleanUp, eventData } from './helpers'

let payload: Payload
const created: number[] = []

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})
afterAll(() => cleanUp(payload, created))

async function roomOf(tables: number, seats: number) {
  const event = await payload.create({
    collection: 'events',
    data: eventData({ tablePlan: [{ shape: 'long', count: tables, seats }] }),
  })
  created.push(event.id)
  return event
}

const guests = (count: number, status: Booking['guests'][number]['status'] = 'pay_at_venue') =>
  Array.from({ length: count }, (_, i) => ({ name: `Guest ${i + 1}`, status, price: 1000 }))

const book = (event: number, data: Partial<Booking> = {}) =>
  payload.create({
    collection: 'bookings',
    data: { event, partyName: 'Smith', telephone: '0123', guests: guests(3), ...data } as Booking,
  })

describe('bookings', () => {
  it('needs a telephone for a phone booking but not for an online one', async () => {
    const event = await roomOf(2, 10)
    await expect(book(event.id, { telephone: '' })).rejects.toThrow(/telephone/i)
    const online = await book(event.id, { telephone: '', source: 'online' })
    expect(online.source).toBe('online')
  })

  it('seats a new party together at the tightest table', async () => {
    const event = await roomOf(2, 10)
    const booking = await book(event.id)
    expect(booking.guests.map((g) => g.table)).toEqual([1, 1, 1])
    expect(booking.liveGuests).toBe(3)
    expect(booking.hasUnseated).toBe(false)
  })

  it('cancelling one guest gives the seat back', async () => {
    const event = await roomOf(1, 10)
    const booking = await book(event.id)
    const updated = await payload.update({
      collection: 'bookings',
      id: booking.id,
      data: { guests: booking.guests.map((g, i) => (i === 0 ? { ...g, status: 'cancelled' } : g)) },
    })
    expect(updated.guests[0].table).toBeNull()
    expect(updated.liveGuests).toBe(2)
  })

  it('cancelling the whole booking cancels and unseats every guest', async () => {
    const event = await roomOf(1, 10)
    const booking = await book(event.id)
    const updated = await payload.update({
      collection: 'bookings',
      id: booking.id,
      data: { cancelBooking: true },
    })
    expect(updated.guests.every((g) => g.status === 'cancelled' && g.table === null)).toBe(true)
    expect(updated.fullyCancelled).toBe(true)
    expect(updated.liveGuests).toBe(0)
  })

  it('marks a party with a live unseated guest', async () => {
    const event = await roomOf(1, 2)
    const booking = await book(event.id) // 3 guests, 2 seats: cannot be seated whole
    expect(booking.guests.map((g) => g.table)).toEqual([null, null, null])
    expect(booking.hasUnseated).toBe(true)
  })

  it('seats a guest added to a party that sits nowhere, but not one placed by hand', async () => {
    const event = await roomOf(2, 10)
    const cancelled = await book(event.id, { guests: guests(2, 'cancelled') })
    const added = await payload.update({
      collection: 'bookings',
      id: cancelled.id,
      data: { guests: [...cancelled.guests, { name: 'New', status: 'pay_at_venue', price: 1000 }] },
    })
    expect(added.guests[2].table).not.toBeNull()

    const byHand = await book(event.id, { guests: guests(2) })
    const unseated = await payload.update({
      collection: 'bookings',
      id: byHand.id,
      data: { guests: byHand.guests.map((g) => ({ ...g, table: null })) },
    })
    const plusOne = await payload.update({
      collection: 'bookings',
      id: byHand.id,
      data: { guests: [...unseated.guests, { name: 'Late', status: 'pay_at_venue', price: 1000 }] },
    })
    expect(plusOne.guests.map((g) => g.table)).toEqual([null, null, null])
  })

  it('refuses to drop a table with guests at it until confirmed, then unseats them', async () => {
    const event = await roomOf(2, 1)
    const one = await book(event.id, { guests: guests(1) })
    const two = await book(event.id, { guests: guests(1) })
    expect([one.guests[0].table, two.guests[0].table]).toEqual([1, 2])

    const shrink = { tablePlan: [{ shape: 'long' as const, count: 1, seats: 1 }], _status: 'published' as const }
    await expect(
      payload.update({ collection: 'events', id: event.id, data: shrink }),
    ).rejects.toThrow(/Table 2.*1 guest/)

    await payload.update({
      collection: 'events',
      id: event.id,
      data: { ...shrink, confirmTableChanges: true },
    })
    const after = await payload.findByID({ collection: 'bookings', id: two.id })
    expect(after.guests[0].table).toBeNull()
    expect(after.hasUnseated).toBe(true)
  })
})
