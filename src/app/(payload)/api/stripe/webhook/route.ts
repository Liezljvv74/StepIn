import config from '@payload-config'
import { getPayload } from 'payload'
import type Stripe from 'stripe'

import { stripe } from '@/lib/stripe'

export async function POST(req: Request) {
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      req.headers.get('stripe-signature') ?? '',
      process.env.STRIPE_WEBHOOK_SECRET ?? '',
    )
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    const session = event.data.object
    if (session.payment_status === 'paid') await markPaid(session)
  }

  return Response.json({ received: true })
}

async function markPaid(session: Stripe.Checkout.Session) {
  const payload = await getPayload({ config })
  const orderId = Number(session.client_reference_id)
  const order = await payload.findByID({ collection: 'orders', id: orderId, depth: 0, disableErrors: true })
  if (!order) {
    payload.logger.error(`Stripe session ${session.id}: no order ${session.client_reference_id}`)
    return
  }
  if (session.amount_total !== order.amount) {
    payload.logger.error(`Stripe session ${session.id}: amount does not match order ${order.id}`)
    return
  }

  // Only a pending order moves to paid, so a repeated delivery changes nothing.
  // Marking it paid also creates its booking (Orders afterChange hook).
  const { errors } = await payload.update({
    collection: 'orders',
    where: { and: [{ id: { equals: orderId } }, { status: { equals: 'pending' } }] },
    depth: 0,
    data: {
      status: 'paid',
      email: session.customer_details?.email,
      phone: session.customer_details?.phone,
      stripeSessionId: session.id,
    },
  })
  // A bulk update reports failures instead of throwing. Fail the request so
  // Stripe delivers the event again rather than leaving a paid order pending.
  if (errors.length > 0) {
    throw new Error(`Order ${orderId} could not be marked paid: ${errors.map((e) => e.message).join('; ')}`)
  }
}
