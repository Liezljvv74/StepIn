import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'

import { seatsAvailable, isLive, type SeatedGuest, type Table } from './seating'

// Serialises everything that counts or takes an event's seats (checkout holds,
// automatic seating) until the caller's transaction ends.
export async function lockEvent(payload: Payload, req: PayloadRequest, eventId: number) {
  const transactionID = await req.transactionID
  if (transactionID == null) throw new Error('lockEvent needs a transaction')
  await (payload.db as unknown as PostgresAdapter).sessions[transactionID].db.execute(
    sql`select pg_advisory_xact_lock(${eventId})`,
  )
}

// The only place an event's seats are counted. Every find is unpaginated:
// Payload returns 10 documents by default, which would undercount a full room.
export async function loadEventSeats(
  payload: Payload,
  eventId: number,
  req?: PayloadRequest,
  excludeBooking?: number,
): Promise<{ tables: Table[]; guests: SeatedGuest[]; heldGuests: number }> {
  const [event, bookings, holds] = await Promise.all([
    payload.findByID({
      collection: 'events',
      id: eventId,
      depth: 0,
      select: { tables: true },
      req,
    }),
    payload.find({
      collection: 'bookings',
      where: { event: { equals: eventId } },
      pagination: false,
      depth: 0,
      select: { guests: true },
      req,
    }),
    payload.find({
      collection: 'orders',
      where: {
        event: { equals: eventId },
        status: { equals: 'pending' },
        holdUntil: { greater_than: new Date().toISOString() },
      },
      pagination: false,
      depth: 0,
      select: { guests: true, quantity: true },
      req,
    }),
  ])

  const tables = (event.tables ?? []).map((t) => ({
    number: t.number,
    seats: t.seats,
    shape: t.shape ?? 'long',
  }))
  const guests = bookings.docs
    .filter((b) => b.id !== excludeBooking)
    .flatMap((b) => b.guests.map((g) => ({ status: g.status, table: g.table ?? null })))
  const heldGuests = holds.docs.reduce((sum, o) => sum + (o.guests?.length || o.quantity), 0)
  return { tables, guests, heldGuests }
}

// Seats still for sale, or null when the room is not laid out (no limit).
export async function seatsLeft(payload: Payload, eventId: number, req?: PayloadRequest) {
  const { tables, guests, heldGuests } = await loadEventSeats(payload, eventId, req)
  return seatsAvailable(tables, guests.filter((g) => isLive(g.status)).length, heldGuests)
}
