import { describe, expect, it } from 'vitest'

import { repeatDates } from '@/lib/repeat'

describe('repeatDates', () => {
  it('keeps 19:30 Berlin time across the change to winter time', () => {
    // 24 Oct 2026 19:30 CEST is 17:30 UTC; a week later 19:30 CET is 18:30 UTC.
    expect(repeatDates('2026-10-24T17:30:00.000Z', 'weekly', 2)).toEqual([
      '2026-10-31T18:30:00.000Z',
      '2026-11-07T18:30:00.000Z',
    ])
  })

  it('repeats daily', () => {
    expect(repeatDates('2026-12-30T18:00:00.000Z', 'daily', 3)).toEqual([
      '2026-12-31T18:00:00.000Z',
      '2027-01-01T18:00:00.000Z',
      '2027-01-02T18:00:00.000Z',
    ])
  })

  it('keeps the day of the month, or the last day of a shorter month', () => {
    // 31 Jan 2027 20:00 CET → 28 Feb (CET), 31 Mar (summer time from 28 Mar: CEST).
    expect(repeatDates('2027-01-31T19:00:00.000Z', 'monthly', 2)).toEqual([
      '2027-02-28T19:00:00.000Z',
      '2027-03-31T18:00:00.000Z',
    ])
  })
})
