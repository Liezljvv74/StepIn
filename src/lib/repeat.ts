import { TIME_ZONE } from './format'

export type RepeatEvery = 'daily' | 'weekly' | 'monthly'

// The site's wall clock (Europe/Berlin) at instant t.
function wallClock(t: number) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TIME_ZONE,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
      .formatToParts(t)
      .map((x) => [x.type, Number(x.value)]),
  )
  return { y: p.year, m: p.month - 1, d: p.day, h: p.hour, min: p.minute, s: p.second }
}

const offsetAt = (t: number) => {
  const w = wallClock(t)
  return Date.UTC(w.y, w.m, w.d, w.h, w.min, w.s) - (t - (t % 1000))
}

// The instant the site's clock shows this date and time (month/day may overflow).
function fromWallClock(y: number, m: number, d: number, h: number, min: number, s: number) {
  const guess = Date.UTC(y, m, d, h, min, s)
  return guess - offsetAt(guess - offsetAt(guess))
}

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate()

// The dates of `times` more events after `start`, at the same local time, so a
// 19:30 event stays at 19:30 across summer/winter time. Monthly keeps the day of
// the month, or the month's last day when it is shorter.
export function repeatDates(start: string, every: RepeatEvery, times: number): string[] {
  const w = wallClock(new Date(start).getTime())
  return Array.from({ length: times }, (_, i) => {
    const n = i + 1
    const [y, m, d] =
      every === 'monthly'
        ? [w.y, w.m + n, Math.min(w.d, daysIn(w.y, w.m + n))]
        : [w.y, w.m, w.d + n * (every === 'weekly' ? 7 : 1)]
    return new Date(fromWallClock(y, m, d, w.h, w.min, w.s)).toISOString()
  })
}
