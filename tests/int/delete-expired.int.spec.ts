import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import type { Booking } from '@/payload-types'
import { deleteExpired } from '@/lib/delete-expired'
import { cleanUp, eventData } from './helpers'

let payload: Payload
const created: number[] = []

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})
afterAll(() => cleanUp(payload, created))

// Dates in 2000 so the run touches nothing else in the dev database.
const now = new Date('2000-03-01T12:00:00Z')
const daysBefore = (days: number) => new Date(now.getTime() - days * 86400000).toISOString()

async function eventWithBooking(date: string) {
  const event = await payload.create({ collection: 'events', data: eventData({ date }) })
  created.push(event.id)
  const booking = await payload.create({
    collection: 'bookings',
    data: { event: event.id, partyName: 'Ann', telephone: '+49 30 1234', guests: [{ name: 'Ann', status: 'pay_at_venue' }] } as Booking,
  })
  return { event, booking }
}

async function order(eventId: number, status: 'pending' | 'paid', createdAt: string) {
  return payload.create({
    collection: 'orders',
    data: { event: eventId, ticketType: 'Standard', quantity: 1, amount: 1000, status, createdAt },
  })
}

const exists = async (collection: 'bookings' | 'orders', id: number) =>
  Boolean(await payload.findByID({ collection, id, disableErrors: true }))

describe('daily clean-up', () => {
  it('deletes bookings and unpaid orders past 29 days, keeps the rest', async () => {
    const old = await eventWithBooking(daysBefore(30))
    const recent = await eventWithBooking(daysBefore(28))
    const oldPending = await order(old.event.id, 'pending', daysBefore(30))
    const newPending = await order(old.event.id, 'pending', daysBefore(28))
    const oldPaid = await order(old.event.id, 'paid', daysBefore(30))

    await deleteExpired(payload, now)

    expect(await exists('bookings', old.booking.id)).toBe(false)
    expect(await exists('bookings', recent.booking.id)).toBe(true)
    expect(await exists('orders', oldPending.id)).toBe(false)
    expect(await exists('orders', newPending.id)).toBe(true)
    expect(await exists('orders', oldPaid.id)).toBe(true)
  })
})
