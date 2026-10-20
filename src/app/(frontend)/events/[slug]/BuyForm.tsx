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
  const [quantity, setQuantity] = useState(1)

  return (
    <form action={action} className="buy">
      <input type="hidden" name="eventId" value={props.eventId} />
      <input type="hidden" name="slug" value={props.slug} />
      <label>
        Guests{' '}
        {/* A list, not a typed number: typing "3" over "1" would otherwise read as 13. */}
        <select name="quantity" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))}>
          {Array.from({ length: props.maxGuests }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
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
