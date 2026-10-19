import type { CollectionBeforeChangeHook } from 'payload'

import { loadEventSeats, lockEvent } from '@/lib/event-seats'
import { isLive, seatParty, type GuestStatus } from '@/lib/seating'

type Guest = { id?: string | null; status: GuestStatus; table?: number | null }

// Applies cancellations, seats newcomers to a party that sits nowhere, and
// stores the summary the admin list filters and marks on.
export const bookingSummary: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const before: Guest[] = originalDoc?.guests ?? []
  let guests: Guest[] = (data.guests ?? before).map((g: Guest) => ({ ...g }))

  if (data.cancelBooking) guests = guests.map((g) => ({ ...g, status: 'cancelled' }))
  for (const g of guests) if (!isLive(g.status)) g.table = null

  // A new party, or one whose every guest was cancelled, is seated like a new
  // booking. A party with live guests but no table is one the owner is placing
  // by hand, so it is left alone.
  const knownIds = new Set(before.map((g) => g.id))
  const newcomers = guests.filter((g) => !knownIds.has(g.id) && isLive(g.status) && g.table == null)
  const hadLiveGuests = before.some((g) => isLive(g.status))
  if (newcomers.length > 0 && !hadLiveGuests) {
    const event = data.event ?? originalDoc?.event
    const eventId: number = typeof event === 'object' ? event.id : event
    // Two parties saved at once must not both take the same free seats.
    await lockEvent(req.payload, req, eventId)
    const { tables, guests: others } = await loadEventSeats(
      req.payload,
      eventId,
      req,
      originalDoc?.id,
    )
    const seats = seatParty(tables, others, newcomers.length)
    if (seats) newcomers.forEach((g, i) => (g.table = seats[i]))
  }

  const live = guests.filter((g) => isLive(g.status))
  data.guests = guests
  data.liveGuests = live.length
  data.hasUnseated = live.some((g) => g.table == null)
  data.fullyCancelled = guests.length > 0 && live.length === 0
  return data
}
