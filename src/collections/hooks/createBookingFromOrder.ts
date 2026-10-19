import type { CollectionAfterChangeHook } from 'payload'

import type { Booking, Order } from '@/payload-types'

// The booking an online order turns into: every guest paid, unseated so that
// the booking's own hook seats the party by the usual rule. Orders made before
// guests were named (quantity only) get "Guest 1…n".
export function bookingFromOrder(order: Order) {
  const eventId = typeof order.event === 'object' ? order.event?.id : order.event
  const guests = order.guests?.length
    ? order.guests
    : Array.from({ length: order.quantity }, (_, i) => ({
        name: `Guest ${i + 1}`,
        ticketType: order.ticketType,
        price: Math.round(order.amount / order.quantity),
      }))
  return {
    event: eventId!,
    partyName: guests[0].name,
    telephone: order.phone,
    source: 'online',
    order: order.id,
    guests: guests.map((g) => ({
      name: g.name,
      status: 'paid',
      ticketType: g.ticketType,
      price: g.price,
    })),
  } satisfies Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>
}

// Runs inside the webhook's update, sharing its transaction. A booking's order
// is unique, so a duplicate delivery racing this one fails and rolls back
// instead of creating a second booking.
export const createBookingFromOrder: CollectionAfterChangeHook<Order> = async ({
  doc,
  previousDoc,
  operation,
  req,
}) => {
  if (operation !== 'update' || previousDoc?.status !== 'pending' || doc.status !== 'paid') return doc
  if (!doc.event) return doc
  await req.payload.create({ collection: 'bookings', data: bookingFromOrder(doc), req })
  return doc
}
