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
  maxGuests: number
}) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkout, {})
  // The box keeps exactly what is typed (clearing "1" to type "3" must not snap
  // back to 1); the browser's min/max check refuses an out-of-range number on submit.
  const [typed, setTyped] = useState('1')
  const quantity = Math.min(Math.max(Math.floor(Number(typed)) || 0, 0), props.maxGuests)

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
          max={props.maxGuests}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          required
        />
      </label>
      {Array.from({ length: quantity }, (_, i) => (
        <fieldset key={i} className="guest">
          <legend>Guest {i + 1}</legend>
          <input name={`guests.${i}.name`} placeholder="Name" aria-label={`Guest ${i + 1} name`} required />
          <select name={`guests.${i}.ticketType`} aria-label={`Guest ${i + 1} ticket`} required>
            {props.ticketTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </fieldset>
      ))}
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
