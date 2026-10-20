import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

// Shows what the webhook has recorded. Reaching this page is not proof of payment.
export default async function SuccessPage(props: PageProps<'/success'>) {
  const { session_id } = await props.searchParams
  const payload = await getPayload({ config })
  const {
    docs: [order],
  } = typeof session_id === 'string'
    ? await payload.find({
        collection: 'orders',
        where: { stripeSessionId: { equals: session_id } },
        limit: 1,
        depth: 1,
        populate: { events: { name: true } },
      })
    : { docs: [] }

  if (!order) {
    return (
      <>
        <h1>Order not found</h1>
        <Link href="/">Back to events</Link>
      </>
    )
  }

  const eventName = order.eventName ?? (typeof order.event === 'object' && order.event ? order.event.name : '')

  return (
    <>
      {order.status === 'paid' ? (
        <>
          <h1>You&apos;re in!</h1>
          <p>
            {order.quantity} {order.quantity === 1 ? 'ticket' : 'tickets'} ({order.ticketType}) for{' '}
            {eventName}.
          </p>
        </>
      ) : (
        <>
          <h1>Confirming your payment…</h1>
          <p>Stripe is confirming your payment. Refresh this page in a moment.</p>
        </>
      )}
      <Link href="/">Back to events</Link>
    </>
  )
}
