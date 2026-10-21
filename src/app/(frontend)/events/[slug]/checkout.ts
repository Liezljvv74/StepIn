'use server'

import config from '@payload-config'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { CURRENCY } from '@/lib/format'
import { CheckoutError, reserveSeats } from '@/lib/reserve-seats'
import { serverUrl } from '@/lib/server-url'
import { stripe } from '@/lib/stripe'
import { stripeLines } from '@/lib/stripe-lines'

export type CheckoutState = { error?: string }

// Anyone may buy, so there is no login check. Only the event id, the guests'
// names and their ticket type ids come from the browser; reserveSeats prices
// every guest from Payload and holds the seats.
export async function checkout(_state: CheckoutState, formData: FormData): Promise<CheckoutState> {
  // Read only as many guests as the form sent rows for, so a made-up quantity
  // cannot make the server build a huge list (Next caps the request at 1 MB).
  const rows = [...formData.keys()].filter((key) => /^guests\.\d+\.name$/.test(key)).length
  const count = Math.min(Number(formData.get('quantity')) || 0, rows)
  const guests = Array.from({ length: count }, (_, i) => ({
    name: String(formData.get(`guests.${i}.name`) ?? ''),
    ticketTypeId: String(formData.get(`guests.${i}.ticketType`) ?? ''),
  }))

  const payload = await getPayload({ config })
  let order
  try {
    order = await reserveSeats(payload, { eventId: Number(formData.get('eventId')), guests })
  } catch (error) {
    if (error instanceof CheckoutError) return { error: error.message }
    throw error
  }

  const slug = String(formData.get('slug') ?? '')

  let session
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: stripeLines(
        (order.guests ?? []).map((g) => ({ ticketType: g.ticketType!, price: g.price! })),
      ).map(({ ticketType, quantity, price }) => ({
        quantity,
        price_data: {
          currency: CURRENCY,
          unit_amount: price,
          product_data: { name: `${order.eventName}: ${ticketType}` },
        },
      })),
      phone_number_collection: { enabled: true },
      // The seats are held exactly as long as the payment page is open.
      expires_at: Math.floor(new Date(order.holdUntil!).getTime() / 1000),
      client_reference_id: String(order.id),
      integration_identifier: 'stepin-tickets-qhwmzrta',
      success_url: `${serverUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${serverUrl}/events/${slug}`,
    })
  } catch (error) {
    // Give the seats straight back rather than holding them for nothing.
    await payload.delete({ collection: 'orders', id: order.id })
    throw error
  }

  await payload.update({
    collection: 'orders',
    id: order.id,
    data: { stripeSessionId: session.id },
  })

  redirect(session.url!)
}
