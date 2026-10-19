import type { CollectionBeforeChangeHook } from 'payload'

import { reconcileTables, type PlanLine, type Table } from '@/lib/seating'

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
  data.tables = tables
  data.highestTableNumber = highestEver
  req.context.droppedTables = dropped
  return data
}
