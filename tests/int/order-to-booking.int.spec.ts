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

async function pendingOrder(seats: number, guestNames: string[]) {
  const event = await payload.create({
    collection: 'events',
    data: eventData({ tablePlan: [{ shape: 'long', count: 1, seats }] }),
  })
  created.push(event.id)
  const order = await payload.create({
    collection: 'orders',
    data: {
      event: event.id,
      eventName: event.name,
      ticketType: 'Standard',
      quantity: guestNames.length,
      amount: 1000 * guestNames.length,
      status: 'pending',
      guests: guestNames.map((name) => ({ name, ticketType: 'Standard', price: 1000 })),
    },
  })
  return { event, order }
}

// What the webhook does: only a pending order moves to paid.
const markPaid = (id: number) =>
  payload.update({
    collection: 'orders',
    where: { and: [{ id: { equals: id } }, { status: { equals: 'pending' } }] },
    data: { status: 'paid', email: 'buyer@example.com', phone: '+49 30 1234' },
  })

const bookingsFor = (orderId: number) =>
  payload.find({ collection: 'bookings', where: { order: { equals: orderId } }, pagination: false, depth: 0 })

describe('paid order becomes a booking', () => {
  it('creates one seated booking of paid guests', async () => {
    const { event, order } = await pendingOrder(10, ['Ann', 'Bob'])
    await markPaid(order.id)

    const { docs } = await bookingsFor(order.id)
    expect(docs).toHaveLength(1)
    const [booking] = docs
    expect(booking.source).toBe('online')
    expect(booking.partyName).toBe('Ann')
    expect(booking.telephone).toBe('+49 30 1234')
    expect(booking.event).toBe(event.id)
    // Payment details are read from the order, not stored on the booking.
    expect([booking.buyerEmail, booking.amount, booking.paymentStatus]).toEqual(['buyer@example.com', 2000, 'paid'])
    // The admin list reads without populating the order; the amount must still come through.
    const listed = await payload.findByID({ collection: 'bookings', id: booking.id, depth: 0 })
    expect(listed.amount).toBe(2000)
    expect(booking.guests.map((g) => [g.name, g.status, g.price, g.table])).toEqual([
      ['Ann', 'paid', 1000, 1],
      ['Bob', 'paid', 1000, 1],
    ])
  })

  it('a repeated delivery creates no second booking', async () => {
    const { order } = await pendingOrder(10, ['Ann'])
    await markPaid(order.id)
    await markPaid(order.id)
    expect((await bookingsFor(order.id)).docs).toHaveLength(1)
  })

  it('two deliveries at the same moment create one booking', async () => {
    const { order } = await pendingOrder(10, ['Ann'])
    await Promise.allSettled([markPaid(order.id), markPaid(order.id)])
    expect((await bookingsFor(order.id)).docs).toHaveLength(1)
    const paid = await payload.findByID({ collection: 'orders', id: order.id })
    expect(paid.status).toBe('paid')
  })

  it('leaves a party that fits nowhere unseated and marked', async () => {
    const { order } = await pendingOrder(2, ['Ann', 'Bob', 'Cat'])
    await markPaid(order.id)
    const [booking] = (await bookingsFor(order.id)).docs
    expect(booking.guests.map((g) => g.table)).toEqual([null, null, null])
    expect(booking.hasUnseated).toBe(true)
  })
})

describe('deleting an order', () => {
  it('deletes its booking too, so no names or phone stay behind', async () => {
    const { order } = await pendingOrder(10, ['Ann'])
    await markPaid(order.id)
    expect((await bookingsFor(order.id)).docs).toHaveLength(1)

    await payload.delete({ collection: 'orders', id: order.id })
    expect((await bookingsFor(order.id)).docs).toHaveLength(0)
  })
})
