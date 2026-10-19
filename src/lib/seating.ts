// Seating rules, ported from StepIn_Old/lib/repository.ts. Pure functions:
// callers load tables and guests from Payload and pass them in.

export type TableShape = 'long' | 'round' | 'square'
export type GuestStatus = 'paid' | 'pay_at_venue' | 'not_paying' | 'cancelled'

export const SEAT_OCCUPYING: readonly GuestStatus[] = ['paid', 'pay_at_venue', 'not_paying']
export const DEFAULT_SEATS = 10

export type PlanLine = { shape: TableShape; count: number; seats: number }
export type Table = { number: number; seats: number; shape: TableShape }
export type SeatedGuest = { status: GuestStatus; table: number | null }

export const isLive = (status: GuestStatus) => SEAT_OCCUPYING.includes(status)

// A guest is seated by table number, so a surviving table keeps its number: the
// lowest-numbered tables are kept, the surplus is dropped, and new tables are
// numbered past the highest number ever used, never reusing one.
export function reconcileTables(
  current: Table[],
  plan: PlanLine[],
  highestEver: number,
): { tables: Table[]; dropped: number[]; highestEver: number } {
  const slots = plan.flatMap((line) =>
    Array.from({ length: line.count }, () => ({ seats: line.seats, shape: line.shape })),
  )
  const existing = [...current].sort((a, b) => a.number - b.number)
  let highest = Math.max(highestEver, ...existing.map((t) => t.number), 0)

  const tables = slots.map((slot, i) => ({
    number: i < existing.length ? existing[i].number : ++highest,
    ...slot,
  }))
  const dropped = existing.slice(slots.length).map((t) => t.number)
  return { tables, dropped, highestEver: highest }
}

export function freeSeats(tables: Table[], guests: SeatedGuest[]): Map<number, number> {
  const free = new Map(tables.map((t) => [t.number, t.seats]))
  for (const guest of guests) {
    if (guest.table === null || !isLive(guest.status) || !free.has(guest.table)) continue
    free.set(guest.table, free.get(guest.table)! - 1)
  }
  return free
}

// Nobody is left sitting on their own: a table taking part of a split party
// takes at least this many of them.
const MIN_GUESTS_PER_SHARED_TABLE = 2

type FreeTable = { number: number; free: number }

// One table number per guest, or null when the party cannot be seated whole:
// a part-seated party is worse than an unseated one the owner can see.
export function seatParty(tables: Table[], guests: SeatedGuest[], partySize: number): number[] | null {
  const free = freeSeats(tables, guests)
  const byNumber: FreeTable[] = tables
    .map((t) => ({ number: t.number, free: Math.max(0, free.get(t.number) ?? 0) }))
    .sort((a, b) => a.number - b.number)

  // The tightest single table that holds everyone, ties to the lower number.
  const single = byNumber
    .filter((t) => t.free >= partySize)
    .sort((a, b) => a.free - b.free || a.number - b.number)[0]
  if (single) return Array(partySize).fill(single.number)

  const shares = planSplitSeating(byNumber, partySize)
  return shares && shares.flatMap((s) => Array(s.guests).fill(s.number))
}

// The closest run of tables (smallest span of table numbers, then fewest
// tables, then lowest) that seats the whole party with at least two per table.
function planSplitSeating(byNumber: FreeTable[], partySize: number) {
  const usable = byNumber.filter((t) => t.free >= MIN_GUESTS_PER_SHARED_TABLE)
  let best: { span: number; tables: FreeTable[] } | null = null

  for (let first = 0; first < usable.length; first++) {
    for (let last = first + 1; last < usable.length; last++) {
      const span = usable[last].number - usable[first].number
      if (best && span > best.span) break
      const chosen = fillBetween(usable, first, last, partySize)
      if (chosen && (!best || span < best.span || chosen.length < best.tables.length)) {
        best = { span, tables: chosen }
      }
    }
  }
  return best && shareOut(best.tables, partySize)
}

function fillBetween(usable: FreeTable[], first: number, last: number, partySize: number) {
  const chosen = [usable[first], usable[last]]
  if (chosen.length * MIN_GUESTS_PER_SHARED_TABLE > partySize) return null
  let capacity = chosen[0].free + chosen[1].free
  if (capacity >= partySize) return chosen

  const between = usable
    .slice(first + 1, last)
    .sort((a, b) => b.free - a.free || a.number - b.number)
  for (const t of between) {
    if ((chosen.length + 1) * MIN_GUESTS_PER_SHARED_TABLE > partySize) return null
    chosen.push(t)
    capacity += t.free
    if (capacity >= partySize) return chosen
  }
  return null
}

// Lowest table first, each taking all it can short of leaving a later table
// below the minimum.
function shareOut(chosen: FreeTable[], partySize: number) {
  const ordered = [...chosen].sort((a, b) => a.number - b.number)
  let left = partySize
  return ordered.map((t, i) => {
    const later = ordered.length - i - 1
    const guests = Math.min(t.free, left - later * MIN_GUESTS_PER_SHARED_TABLE)
    left -= guests
    return { number: t.number, guests }
  })
}

// Seats still for sale. null means the room is not laid out yet: no limit.
export function seatsAvailable(tables: Table[], liveGuests: number, heldGuests: number): number | null {
  if (tables.length === 0) return null
  const room = tables.reduce((sum, t) => sum + t.seats, 0)
  return Math.max(0, room - liveGuests - heldGuests)
}
