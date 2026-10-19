'use server'

import config from '@payload-config'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { CURRENCY } from '@/lib/format'
import { stripe } from '@/lib/stripe'

// Anyone may buy, so there is no login check. Only the event slug, ticket type
// id and quantity come from the browser; the price is read from Payload here.
export async function checkout(formData: FormData) {
  const slug = String(formData.get('slug'))
  const ticketTypeId = String(formData.get('ticketType'))
  const quantity = Number(formData.get('quantity'))
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new Error('Quantity must be between 1 and 10')
  }

  const payload = await getPayload({ config })
  const {
    docs: [event],
  } = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    overrideAccess: false, // published events only
    limit: 1,
    depth: 0,
  })
  const ticket = event?.ticketTypes.find((t) => t.id === ticketTypeId)
  if (!event || !ticket) throw new Error('Ticket not found')
  if (new Date(event.date) < new Date()) throw new Error('This event has already taken place')

  const order = await payload.create({
    collection: 'orders',
    data: {
      event: event.id,
      ticketType: ticket.name,
      quantity,
      amount: ticket.price * quantity,
      status: 'pending',
    },
  })

  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      line_items: [
        {
          quantity,
          price_data: {
            currency: CURRENCY,
            unit_amount: ticket.price,
            product_data: { name: `${event.name}: ${ticket.name}` },
          },
        },
      ],
      client_reference_id: String(order.id),
      metadata: { orderId: String(order.id) },
      integration_identifier: 'stepin-tickets-qhwmzrta',
      success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/events/${event.slug}`,
    },
    { idempotencyKey: `order-${order.id}` },
  )

  await payload.update({
    collection: 'orders',
    id: order.id,
    data: { stripeSessionId: session.id },
  })

  redirect(session.url!)
}
