import { createLocalReq, type Payload } from 'payload'

import type { Order } from '@/payload-types'
import { lockEvent, seatsLeft } from './event-seats'

// Stripe refuses a Checkout Session that expires less than 30 minutes after it
// is created, and the session is created a moment after the hold starts.
export const HOLD_MINUTES = 31
export const MAX_GUESTS = 10
export const SOLD_OUT_MESSAGE =
  'All seats are taken or being paid for right now, try again in a few minutes'

// A refusal the buyer may read; anything else is an internal error.
export class CheckoutError extends Error {}

export type ReserveInput = {
  eventId: number
  guests: { name: string; ticketTypeId: string }[]
}

// Checks the request against Payload and holds the seats on a pending order.
// The count and the order happen under a per-event lock, so two buyers cannot
// both take the last seats. Only names and ids come from the browser: every
// price is read from the event here.
export async function reserveSeats(payload: Payload, input: ReserveInput): Promise<Order> {
  const guests = input.guests.map((g) => ({ ...g, name: String(g.name ?? '').trim() }))
  if (!Number.isInteger(input.eventId)) throw new CheckoutError('Unknown event')
  if (guests.length < 1 || guests.length > MAX_GUESTS) {
    throw new CheckoutError(`Choose between 1 and ${MAX_GUESTS} guests`)
  }
  if (guests.some((g) => g.name === '')) throw new CheckoutError('Every guest needs a name')

  const req = await createLocalReq({}, payload)
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('Database transactions are not available')
  req.transactionID = transactionID

  try {
    await lockEvent(payload, req, input.eventId)

    const event = await payload.findByID({
      collection: 'events',
      id: input.eventId,
      overrideAccess: false, // published events only
      disableErrors: true,
      depth: 0,
      req,
    })
    if (!event) throw new CheckoutError('Unknown event')
    if (new Date(event.date) < new Date())
      throw new CheckoutError('This event has already taken place')

    const priced = guests.map((g) => {
      const ticket = event.ticketTypes.find((t) => t.id === g.ticketTypeId)
      if (!ticket) throw new CheckoutError('Unknown ticket type')
      return { name: g.name, ticketType: ticket.name, price: ticket.price }
    })

    const left = await seatsLeft(payload, event.id, req)
    if (left !== null && priced.length > left) throw new CheckoutError(SOLD_OUT_MESSAGE)

    const counts = new Map<string, number>()
    for (const g of priced) counts.set(g.ticketType, (counts.get(g.ticketType) ?? 0) + 1)

    const order = await payload.create({
      collection: 'orders',
      data: {
        event: event.id,
        eventName: event.name,
        eventDate: event.date,
        ticketType: [...counts].map(([name, n]) => `${name} ×${n}`).join(', '),
        quantity: priced.length,
        amount: priced.reduce((sum, g) => sum + g.price, 0),
        guests: priced,
        status: 'pending',
        holdUntil: new Date(Date.now() + HOLD_MINUTES * 60000).toISOString(),
      },
      req,
    })
    await payload.db.commitTransaction(transactionID)
    return order
  } catch (error) {
    await payload.db.rollbackTransaction(transactionID)
    throw error
  }
}
