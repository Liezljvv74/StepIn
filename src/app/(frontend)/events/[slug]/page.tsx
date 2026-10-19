import config from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'

import { formatDate, formatPrice } from '@/lib/format'
import { checkout } from './checkout'

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
      ) : (
        <form action={checkout} className="buy">
          <input type="hidden" name="eventId" value={event.id} />
          <fieldset>
            <legend>Ticket</legend>
            {event.ticketTypes.map((ticket, i) => (
              <label key={ticket.id}>
                <input
                  type="radio"
                  name="ticketType"
                  value={ticket.id ?? ''}
                  defaultChecked={i === 0}
                  required
                />
                {ticket.name} <span>{formatPrice(ticket.price)}</span>
              </label>
            ))}
          </fieldset>
          <label>
            Quantity{' '}
            <input type="number" name="quantity" min={1} max={10} defaultValue={1} required />
          </label>
          <button type="submit">Buy tickets</button>
        </form>
      )}
    </article>
  )
}
