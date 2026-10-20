import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'

import { seatsAvailable, type SeatedGuest, type Table } from './seating'
import type { Event } from '@/payload-types'

// Serialises everything that counts or takes an event's seats (checkout holds,
// automatic seating) until the caller's transaction ends.
export async function lockEvent(payload: Payload, req: PayloadRequest, eventId: number) {
  const transactionID = await req.transactionID
  if (transactionID == null) throw new Error('lockEvent needs a transaction')
  await (payload.db as unknown as PostgresAdapter).sessions[transactionID].db.execute(
    sql`select pg_advisory_xact_lock(${eventId})`,
  )
}

// Every find here is unpaginated: Payload returns 10 documents by default,
// which would undercount a full room.

const toTables = (event: Pick<Event, 'tables'>): Table[] =>
  (event.tables ?? []).map((t) => ({ number: t.number, seats: t.seats, shape: t.shape ?? 'long' }))

// Party sizes of unpaid online orders still holding seats, oldest first.
async function heldParties(payload: Payload, eventId: number, req?: PayloadRequest) {
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      event: { equals: eventId },
      status: { equals: 'pending' },
      holdUntil: { greater_than: new Date().toISOString() },
    },
    sort: 'createdAt',
    pagination: false,
    depth: 0,
    select: { quantity: true },
    req,
  })
  return docs.map((o) => o.quantity)
}

// Who sits where, for seating a party: every guest with their table, and the
// online holds that are still paying.
export async function loadEventSeats(
  payload: Payload,
  eventId: number,
  req?: PayloadRequest,
  excludeBooking?: number,
): Promise<{ tables: Table[]; guests: SeatedGuest[]; heldParties: number[] }> {
  const [event, bookings, held] = await Promise.all([
    payload.findByID({ collection: 'events', id: eventId, depth: 0, select: { tables: true }, req }),
    payload.find({
      collection: 'bookings',
      where: { event: { equals: eventId } },
      pagination: false,
      depth: 0,
      select: { guests: true },
      req,
    }),
    heldParties(payload, eventId, req),
  ])
  const guests = bookings.docs
    .filter((b) => b.id !== excludeBooking)
    .flatMap((b) => b.guests.map((g) => ({ status: g.status, table: g.table ?? null })))
  return { tables: toTables(event), guests, heldParties: held }
}

// Seats still for sale, or null when the room is not laid out (no limit).
// Counts from each booking's stored liveGuests, so a page view reads one number
// per booking instead of every guest.
export async function seatsLeft(
  payload: Payload,
  event: Pick<Event, 'id' | 'tables'>,
  req?: PayloadRequest,
) {
  const tables = toTables(event)
  if (tables.length === 0) return null
  const [bookings, held] = await Promise.all([
    payload.find({
      collection: 'bookings',
      where: { event: { equals: event.id } },
      pagination: false,
      depth: 0,
      select: { liveGuests: true },
      req,
    }),
    heldParties(payload, event.id, req),
  ])
  const live = bookings.docs.reduce((sum, b) => sum + (b.liveGuests ?? 0), 0)
  return seatsAvailable(tables, live, held.reduce((sum, n) => sum + n, 0))
}
