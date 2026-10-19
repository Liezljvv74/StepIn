import { describe, expect, it } from 'vitest'

import {
  freeSeats,
  reconcileTables,
  seatParty,
  seatsAvailable,
  type SeatedGuest,
  type Table,
} from '@/lib/seating'

const table = (number: number, seats: number, shape: Table['shape'] = 'long'): Table => ({
  number,
  seats,
  shape,
})
const seatedAt = (tableNumber: number | null, count: number, status: SeatedGuest['status'] = 'paid') =>
  Array.from({ length: count }, (): SeatedGuest => ({ status, table: tableNumber }))

describe('reconcileTables', () => {
  it('lays out a new room in plan order', () => {
    const result = reconcileTables(
      [],
      [
        { shape: 'long', count: 3, seats: 10 },
        { shape: 'round', count: 2, seats: 8 },
      ],
      0,
    )
    expect(result.tables.map((t) => t.number)).toEqual([1, 2, 3, 4, 5])
    expect(result.tables.map((t) => t.seats)).toEqual([10, 10, 10, 8, 8])
    expect(result.tables.map((t) => t.shape)).toEqual(['long', 'long', 'long', 'round', 'round'])
    expect(result.dropped).toEqual([])
    expect(result.highestEver).toBe(5)
  })

  it('keeps the lowest-numbered tables when the room shrinks', () => {
    const current = [1, 2, 3, 4, 5].map((n) => table(n, 10))
    const result = reconcileTables(current, [{ shape: 'long', count: 3, seats: 10 }], 5)
    expect(result.tables.map((t) => t.number)).toEqual([1, 2, 3])
    expect(result.dropped).toEqual([4, 5])
    expect(result.highestEver).toBe(5)
  })

  it('numbers new tables past the highest ever used', () => {
    const current = [1, 2, 3].map((n) => table(n, 10))
    const result = reconcileTables(current, [{ shape: 'long', count: 4, seats: 10 }], 5)
    expect(result.tables.map((t) => t.number)).toEqual([1, 2, 3, 6])
    expect(result.highestEver).toBe(6)
  })

  it('drops every table for a plan of nought tables', () => {
    const current = [1, 2].map((n) => table(n, 10))
    const result = reconcileTables(current, [{ shape: 'round', count: 0, seats: 10 }], 2)
    expect(result.tables).toEqual([])
    expect(result.dropped).toEqual([1, 2])
  })
})

describe('freeSeats', () => {
  it('ignores cancelled and unseated guests', () => {
    const free = freeSeats(
      [table(1, 10)],
      [...seatedAt(1, 3), ...seatedAt(1, 2, 'cancelled'), ...seatedAt(null, 4)],
    )
    expect(free.get(1)).toBe(7)
  })
})

describe('seatParty', () => {
  it('picks the tightest table the party still fits', () => {
    const tables = [table(1, 10), table(2, 10)]
    expect(seatParty(tables, seatedAt(1, 6), 3)).toEqual([1, 1, 1])
  })

  it('breaks ties on the lower table number', () => {
    expect(seatParty([table(2, 6), table(1, 6)], [], 4)).toEqual([1, 1, 1, 1])
  })

  it('splits a party too large for any table across the closest run', () => {
    const tables = [table(1, 4), table(2, 4), table(3, 4)]
    expect(seatParty(tables, [], 6)).toEqual([1, 1, 1, 1, 2, 2])
  })

  it('returns null when no arrangement seats the whole party', () => {
    const tables = [table(1, 1), table(2, 1), table(3, 1)]
    expect(seatParty(tables, [], 3)).toBeNull()
  })
})

describe('seatsAvailable', () => {
  it('has no limit when no tables are laid out', () => {
    expect(seatsAvailable([], 5, 0)).toBeNull()
  })

  it('subtracts live and held guests from the room', () => {
    expect(seatsAvailable([table(1, 10), table(2, 10)], 12, 3)).toBe(5)
  })

  it('never goes below nought', () => {
    expect(seatsAvailable([table(1, 10)], 12, 0)).toBe(0)
  })
})
