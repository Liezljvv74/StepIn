import Link from 'next/link'

export const metadata = { title: 'Privacy – StepIn' }

const CONTACT = 'liezl.fourie@amplivine.world'

export default function PrivacyPage() {
  return (
    <article className="privacy">
      <h1>Privacy</h1>
      <p>Last updated: 20 October 2026</p>

      <h2>Who is responsible</h2>
      <p>
        StepIn is run by Liezl Fourie. For anything about your data, email{' '}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>What we collect and why</h2>
      <ul>
        <li>
          <strong>Guest names</strong> you type when buying tickets, to put each guest on the door
          list and seat them.
        </li>
        <li>
          <strong>Your email and phone number</strong>, collected by Stripe at checkout, to send your
          receipt and contact you about your booking.
        </li>
        <li>
          <strong>Order details</strong> (event, tickets, amount, payment status), as our record of
          the sale.
        </li>
        <li>
          <strong>Names and phone numbers given over the phone</strong> when you book by phone.
        </li>
      </ul>
      <p>
        We use this data to sell you tickets and run the event, which is a contract with you (GDPR
        Art. 6(1)(b)). We keep payment records because tax and accounting law requires it (Art.
        6(1)(c)). We do not use your data for marketing and do not sell it.
      </p>

      <h2>Card details</h2>
      <p>
        You pay on Stripe&apos;s own page. Your card details go to Stripe only; StepIn never sees or
        stores them. Stripe also processes payment data for its own purposes, such as fraud
        prevention, under its own{' '}
        <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">
          privacy policy
        </a>
        .
      </p>

      <h2>Services that handle your data</h2>
      <ul>
        <li>
          <strong>Stripe</strong>: payments.
        </li>
        <li>
          <strong>Neon</strong>: our database, stored in Frankfurt, Germany.
        </li>
        <li>
          <strong>Vercel</strong>: hosts this website, running in Frankfurt, Germany.
        </li>
        <li>
          <strong>Resend</strong>: sends emails to StepIn&apos;s administrators only (for example a
          password reset), not to customers.
        </li>
      </ul>
      <p>
        These companies are based in the United States, so your data may be accessed from there.
        Each is bound by a data processing agreement and protects transfers with the EU–US Data
        Privacy Framework or the EU&apos;s Standard Contractual Clauses.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Bookings (guest names, phone, seating): deleted within 30 days after the event.</li>
        <li>Orders that were never paid: deleted within 30 days.</li>
        <li>
          Paid orders: kept for as long as tax and accounting law requires, then deleted.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        The public site sets no cookies and uses no analytics or tracking. The admin area sets one
        login cookie for StepIn&apos;s administrators.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to see the data we hold about you, get a copy of it, correct it, have it deleted,
        restrict how we use it, or object to its use. Email{' '}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and we will reply within one month. You can also
        complain to the data protection authority in your country.
      </p>

      <Link href="/">Back to events</Link>
    </article>
  )
}
