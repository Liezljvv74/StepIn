'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'

import { checkout, type CheckoutState } from './checkout'

type TicketType = { id: string; label: string }

// One row per guest: their name and their own ticket type.
export function BuyForm(props: {
  eventId: number
  slug: string
  ticketTypes: TicketType[]
  seatsLeft: number | null // null: the room has no table plan, so no limit
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkout, {})
  // Any number of guests, up to the seats left. The box keeps what is typed
  // (clearing "1" to type "3" must not snap back to 1), except a number over the
  // seats left, which becomes that number so the box always matches the name
  // rows shown. The browser's min check refuses 0 on submit.
  const max = props.seatsLeft ?? Infinity
  const [typed, setTyped] = useState('1')
  const quantity = Math.min(Math.max(Math.floor(Number(typed)) || 0, 0), max)

  return (
    <form action={action} className="buy">
      <input type="hidden" name="eventId" value={props.eventId} />
      <input type="hidden" name="slug" value={props.slug} />
      <label>
        Guests{' '}
        <input
          type="number"
          name="quantity"
          min={1}
          max={props.seatsLeft ?? undefined}
          value={typed}
          onChange={(e) => setTyped(Number(e.target.value) > max ? String(max) : e.target.value)}
          required
        />
        {props.seatsLeft !== null && <span> ({props.seatsLeft} seats left)</span>}
      </label>
      <ol className="guests">
        {Array.from({ length: quantity }, (_, i) => (
          <li key={i}>
            <input name={`guests.${i}.name`} placeholder="Name" aria-label={`Guest ${i + 1} name`} required />
            <select name={`guests.${i}.ticketType`} aria-label={`Guest ${i + 1} ticket`} required>
              {props.ticketTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ol>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending}>
        {pending ? 'Holding your seats…' : 'Buy tickets'}
      </button>
      <p className="fine-print">
        Guest names, your email and phone are used only for this booking. See our{' '}
        <Link href="/privacy">privacy policy</Link>.
      </p>
    </form>
  )
}
