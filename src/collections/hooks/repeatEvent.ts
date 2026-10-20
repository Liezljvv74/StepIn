import type { CollectionAfterChangeHook } from 'payload'

import { repeatDates, type RepeatEvery } from '@/lib/repeat'
import type { Event } from '@/payload-types'

// "Repeat: number of times" on an event: copies it onto that many later dates,
// with the same status, ticket types and table plan. Each copy gets its own
// slug from its date; copies are not linked to the original afterwards.
export const repeatEvent: CollectionAfterChangeHook<Event> = async ({ data, doc, req }) => {
  const times = Math.min(Math.floor(Number(data.repeatTimes) || 0), 52)
  if (times < 1) return doc

  const every: RepeatEvery = (data.repeatEvery as RepeatEvery) ?? 'weekly'
  for (const date of repeatDates(doc.date, every, times)) {
    await req.payload.create({
      collection: 'events',
      data: {
        name: doc.name,
        description: doc.description,
        date,
        venue: doc.venue,
        image: typeof doc.image === 'object' ? doc.image?.id : doc.image,
        ticketTypes: doc.ticketTypes.map((t) => ({ name: t.name, price: t.price })),
        tablePlan: doc.tablePlan?.map((l) => ({ shape: l.shape, count: l.count, seats: l.seats })),
        _status: doc._status ?? 'draft',
      },
      draft: doc._status !== 'published',
      req,
    })
  }
  return doc
}
