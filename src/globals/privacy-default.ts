import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload, PayloadRequest } from 'payload'

// The first version of the policy, written into the Privacy global once by
// migration 20261020_113152_privacy_global. After that it is edited in /admin.
const markdown = `## Who is responsible

StepIn is run by Liezl Fourie, Jesse Owens Ring, 14641 Wustermark, Germany. For anything about your data, email [liezl.fourie@amplivine.world](mailto:liezl.fourie@amplivine.world).

## What we collect and why

- **Guest names** you type when buying tickets, to seat each guest and check them in at the door.
- **Your email and phone number**, collected by Stripe at checkout, so Stripe can send your payment receipt and we can contact you about your booking.
- **Order details** (event, tickets, amount, payment status), as our record of the sale.
- **Names and phone numbers given over the phone** when you book by phone.

We use this data to sell you tickets and run the event, which is a contract with you (GDPR Art. 6(1)(b)). We keep payment records because tax and accounting law requires it (Art. 6(1)(c)). We do not use your data for marketing and do not sell it.

## Card details

You pay on Stripe's own page. Your card details go to Stripe only; StepIn never sees or stores them. Stripe also processes payment data for its own purposes, such as fraud prevention, under its own [privacy policy](https://stripe.com/privacy).

## Services that handle your data

- **Stripe**: payments.
- **Neon**: our database, stored in Frankfurt, Germany.
- **Vercel**: hosts this website, running in Frankfurt, Germany.
- **Resend**: sends emails to StepIn's administrators only (for example a password reset), not to customers.

These companies are based in the United States, so your data may be accessed from there. Each is bound by a data processing agreement and protects transfers with the EU–US Data Privacy Framework or the EU's Standard Contractual Clauses.

## How long we keep it

- Bookings (guest names, phone, seating): deleted within 30 days after the event.
- Orders that were never paid: deleted within 30 days.
- Paid orders (event, tickets, amount, your email and phone, and the guest names): kept for as long as tax and accounting law requires, then deleted.

## Cookies

The public site sets no cookies and uses no analytics or tracking. The admin area sets one login cookie for StepIn's administrators.

## Your rights

You can ask to see the data we hold about you, get a copy of it, correct it, have it deleted, restrict how we use it, or object to its use. Email [liezl.fourie@amplivine.world](mailto:liezl.fourie@amplivine.world) and we will reply within one month. You can also complain to the data protection authority in your country.
`

export async function seedPrivacy(payload: Payload, req?: PayloadRequest) {
  const editorConfig = await editorConfigFactory.default({ config: payload.config })
  await payload.updateGlobal({
    slug: 'privacy',
    data: { content: convertMarkdownToLexical({ editorConfig, markdown }) },
    req,
  })
}
