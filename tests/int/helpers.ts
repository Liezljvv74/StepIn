import type { Payload } from 'payload'

import type { Event } from '@/payload-types'

let counter = 0

// A published event a month from now, unique per call so tests never collide.
export const eventData = (overrides: Partial<Event> = {}) => {
  counter += 1
  const id = `${Date.now()}-${counter}`
  return {
    name: `Test event ${id}`,
    slug: `test-event-${id}`,
    description: 'Created by an integration test.',
    venue: 'Test Hall',
    date: new Date(Date.now() + 30 * 86400000).toISOString(),
    ticketTypes: [
      { name: 'Standard', price: 1000 },
      { name: 'VIP', price: 2500 },
    ],
    _status: 'published' as const,
    ...overrides,
  }
}

// Deletes what a test created: its bookings and orders (orders outlive an event), then the events.
export async function cleanUp(payload: Payload, eventIds: number[]) {
  if (eventIds.length === 0) return
  const where = { event: { in: eventIds } }
  for (const collection of ['bookings', 'orders'] as const) {
    if (payload.collections[collection]) await payload.delete({ collection, where })
  }
  await payload.delete({ collection: 'events', where: { id: { in: eventIds } } })
}
