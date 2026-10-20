import { APIError, type CollectionAfterChangeHook, type CollectionBeforeChangeHook } from 'payload'

import { isLive, reconcileTables, type PlanLine, type Table } from '@/lib/seating'

// Turns the table plan into numbered tables when an event is published. A draft
// save leaves the tables alone: guests are seated against the published room.
export const reconcileEventTables: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (data._status === 'draft' || !data.tablePlan) return data

  const { tables, dropped, highestEver } = reconcileTables(
    (originalDoc?.tables ?? []) as Table[],
    data.tablePlan as PlanLine[],
    originalDoc?.highestTableNumber ?? 0,
  )
  // Dropping a table where guests sit unseats them, so it needs a confirmation.
  const seatedThere = originalDoc && dropped.length > 0 ? await guestsAt(req, originalDoc.id, dropped) : 0
  if (seatedThere > 0 && !data.confirmTableChanges) {
    throw new APIError(
      `Saving removes ${dropped.length === 1 ? 'Table' : 'Tables'} ${dropped.join(', ')} and unseats ${seatedThere} guest${seatedThere === 1 ? '' : 's'}. Tick "Confirm" to save.`,
      400,
      null,
      true,
    )
  }

  data.tables = tables
  data.highestTableNumber = highestEver
  req.context.droppedTables = dropped
  return data
}

// Unseats whoever sat at the tables the publish dropped.
export const unseatDroppedTables: CollectionAfterChangeHook = async ({ doc, req }) => {
  const dropped = (req.context.droppedTables as number[] | undefined) ?? []
  if (dropped.length === 0) return doc
  req.context.droppedTables = []
  const { docs } = await req.payload.find({
    collection: 'bookings',
    where: { event: { equals: doc.id }, 'guests.table': { in: dropped } },
    pagination: false,
    depth: 0,
    req,
  })
  for (const booking of docs) {
    await req.payload.update({
      collection: 'bookings',
      id: booking.id,
      data: {
        guests: booking.guests.map((g) =>
          g.table != null && dropped.includes(g.table) ? { ...g, table: null } : g,
        ),
      },
      req,
    })
  }
  return doc
}

async function guestsAt(req: Parameters<CollectionBeforeChangeHook>[0]['req'], eventId: number, tables: number[]) {
  const { docs } = await req.payload.find({
    collection: 'bookings',
    where: { event: { equals: eventId } },
    pagination: false,
    depth: 0,
    select: { guests: true },
    req,
  })
  return docs
    .flatMap((b) => b.guests)
    .filter((g) => isLive(g.status) && g.table != null && tables.includes(g.table)).length
}
