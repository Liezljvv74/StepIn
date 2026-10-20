import type { Payload, Where } from 'payload'

// The privacy policy promises bookings and unpaid orders are gone within 30
// days; the daily cron deletes them once they are this old. Paid orders stay.
export const RETENTION_DAYS = 29

// Payload deletes one document at a time (with hooks), so each run takes at most
// this many per collection; the next day's run picks up any rest.
export const BATCH = 200

async function deleteBatch(payload: Payload, collection: 'bookings' | 'orders', where: Where) {
  const { docs } = await payload.find({ collection, where, limit: BATCH, depth: 0, select: {} })
  if (docs.length === 0) return 0
  const deleted = await payload.delete({
    collection,
    where: { id: { in: docs.map((d) => d.id) } },
    depth: 0,
  })
  return deleted.docs.length
}

export async function deleteExpired(payload: Payload, now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86400000).toISOString()
  return {
    bookings: await deleteBatch(payload, 'bookings', { 'event.date': { less_than: cutoff } }),
    orders: await deleteBatch(payload, 'orders', {
      and: [{ status: { equals: 'pending' } }, { createdAt: { less_than: cutoff } }],
    }),
  }
}
