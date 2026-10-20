import config from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { seatsLeft } from '@/lib/event-seats'
import { formatDate, formatPrice } from '@/lib/format'
import { MAX_GUESTS, SOLD_OUT_MESSAGE } from '@/lib/reserve-seats'
import { BuyForm } from './BuyForm'

export const dynamic = 'force-dynamic'

export default async function EventPage(props: PageProps<'/events/[slug]'>) {
  const { slug } = await props.params
  const payload = await getPayload({ config })
  const {
    docs: [event],
  } = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    overrideAccess: false,
    limit: 1,
    depth: 1,
  })
  if (!event) notFound()

  const image = typeof event.image === 'object' ? event.image : null
  const isPast = new Date(event.date) < new Date()
  const left = isPast ? 0 : await seatsLeft(payload, event)

  return (
    <article className="event">
      <header>
        {image?.url && <img src={image.url} alt={image.alt} />}
        <h1>{event.name}</h1>
        <p className="meta">
          {formatDate(event.date)} · {event.venue}
        </p>
      </header>
      <p className="description">{event.description}</p>

      {isPast ? (
        <p className="buy">This event has already taken place.</p>
      ) : left === 0 ? (
        <div className="buy">
          <strong>Sold out</strong>
          <p>{SOLD_OUT_MESSAGE}.</p>
        </div>
      ) : (
        <BuyForm
          eventId={event.id}
          slug={event.slug}
          maxGuests={Math.min(MAX_GUESTS, left ?? MAX_GUESTS)}
          ticketTypes={event.ticketTypes.map((t) => ({
            id: t.id!,
            label: `${t.name} ${formatPrice(t.price)}`,
          }))}
        />
      )}
    </article>
  )
}
