import type { Payload } from 'payload'

// The privacy policy promises bookings and unpaid orders are gone within 30
// days; the daily cron deletes them once they are this old. Paid orders stay.
export const RETENTION_DAYS = 29

export async function deleteExpired(payload: Payload, now = new Date()) {
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86400000).toISOString()
  const bookings = await payload.delete({
    collection: 'bookings',
    where: { 'event.date': { less_than: cutoff } },
    depth: 0,
  })
  const orders = await payload.delete({
    collection: 'orders',
    where: { and: [{ status: { equals: 'pending' } }, { createdAt: { less_than: cutoff } }] },
    depth: 0,
  })
  return { bookings: bookings.docs.length, orders: orders.docs.length }
}
