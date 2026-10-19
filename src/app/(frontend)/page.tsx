import config from '@payload-config'
import Link from 'next/link'
import { getPayload } from 'payload'

import { formatDate, formatPrice } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payload = await getPayload({ config })
  const { docs: events } = await payload.find({
    collection: 'events',
    where: { date: { greater_than: new Date().toISOString() } },
    sort: 'date',
    overrideAccess: false,
    depth: 1,
  })

  return (
    <>
      <h1>Upcoming events</h1>
      {events.length === 0 && <p>No events yet. Check back soon.</p>}
      <ul className="events">
        {events.map((event) => {
          const image = typeof event.image === 'object' ? event.image : null
          const from = Math.min(...event.ticketTypes.map((t) => t.price))
          return (
            <li key={event.id}>
              <Link href={`/events/${event.slug}`} className="card">
                {image?.url && <img src={image.url} alt={image.alt} />}
                <div className="card-text">
                  <h2>{event.name}</h2>
                  <p>
                    {formatDate(event.date)} · {event.venue}
                  </p>
                </div>
                <span className="price">From {formatPrice(from)}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
