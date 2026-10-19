import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import config from '@/payload.config'
import { POST } from '@/app/(payload)/api/stripe/webhook/route'
import { stripe } from '@/lib/stripe'
import { cleanUp, eventData } from './helpers'

let payload: Payload
const created: number[] = []

beforeAll(async () => {
  payload = await getPayload({ config: await config })
})
afterAll(() => cleanUp(payload, created))

async function pendingOrder(price = 1000) {
  const event = await payload.create({
    collection: 'events',
    data: eventData({ tablePlan: [{ shape: 'long', count: 1, seats: 10 }] }),
  })
  created.push(event.id)
  return payload.create({
    collection: 'orders',
    data: {
      event: event.id,
      ticketType: 'Standard ×1',
      quantity: 1,
      amount: price,
      status: 'pending',
      guests: [{ name: 'Ann', ticketType: 'Standard', price }],
    },
  })
}

// A checkout.session.completed delivery for the order, signed like Stripe signs it.
function delivery(orderId: number, amount = 1000) {
  const body = JSON.stringify({
    id: `evt_test_${orderId}`,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_${orderId}_${Date.now()}`,
        object: 'checkout.session',
        client_reference_id: String(orderId),
        payment_status: 'paid',
        amount_total: amount,
        customer_details: { email: 'ann@example.com', phone: '+49 30 5555' },
      },
    },
  })
  const signature = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  })
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body,
  })
}

describe('Stripe webhook', () => {
  it('marks the order paid and creates its booking with the phone number', async () => {
    const order = await pendingOrder()
    const response = await POST(delivery(order.id))
    expect(response.status).toBe(200)

    const paid = await payload.findByID({ collection: 'orders', id: order.id })
    expect(paid.status).toBe('paid')
    expect(paid.phone).toBe('+49 30 5555')
    const { docs } = await payload.find({
      collection: 'bookings',
      where: { order: { equals: order.id } },
      depth: 0,
    })
    expect(docs.map((b) => b.telephone)).toEqual(['+49 30 5555'])
  })

  it('answers with an error when the booking cannot be created, so Stripe retries', async () => {
    const order = await pendingOrder()
    // A booking already holding this order makes the new one fail its unique check.
    await payload.create({
      collection: 'bookings',
      data: {
        event: order.event as number,
        partyName: 'Clash',
        source: 'online',
        order: order.id,
        guests: [{ name: 'X', status: 'paid', price: 1000 }],
      },
    })
    await expect(POST(delivery(order.id))).rejects.toThrow(/could not be marked paid/)
    const still = await payload.findByID({ collection: 'orders', id: order.id })
    expect(still.status).toBe('pending')
  })

  it('keeps the order pending when the booking fails validation, so a retry can still book it', async () => {
    // A negative price fails the booking's own validation: not a database error.
    const order = await pendingOrder(-5)
    await expect(POST(delivery(order.id, -5))).rejects.toThrow(/could not be marked paid/)
    const still = await payload.findByID({ collection: 'orders', id: order.id })
    expect(still.status).toBe('pending')
  })
})
