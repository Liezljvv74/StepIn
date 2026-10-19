@AGENTS.md

# StepIn

A ticketed event page. The owner manages events and ticket prices in an admin
panel; customers browse the events and buy tickets through Stripe Checkout.

It needs both halves, and is not this project without either:

- **CMS:** the event listings. The owner creates and edits events (name,
  description, date and time, venue, image) and their ticket prices in the
  Payload admin panel at `/admin`. The public pages show only what is stored
  there, so changing content needs no code change.
- **Payment:** the ticket sale. A customer picks an event and a ticket type,
  pays through Stripe Checkout (sandbox), and the order counts as paid only
  once Stripe confirms it.

## Stack

- Payload 3 inside Next.js (App Router): `src/app/(payload)` is the admin and
  API, `src/app/(frontend)` is the public site.
- Postgres on Neon (`DATABASE_URL` in `.env`, project linked in `.neon`).
- Stripe Checkout in sandbox mode, using test keys only.

## Rules for the payment

- Prices come from Payload on the server. Never trust a price or amount sent
  from the browser.
- Money is stored in integer cents, matching Stripe's `unit_amount`.
- An order becomes paid only from the `checkout.session.completed` webhook,
  with its signature verified (`STRIPE_WEBHOOK_SECRET`). The success page is
  not proof of payment.
- Handling the webhook must be idempotent: the same event delivered twice
  must not create two tickets.

## Environment

`.env` (never committed): `DATABASE_URL`, `PAYLOAD_SECRET`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SERVER_URL`.
`.env.example` lists them without values.

## Commands

```bash
npm run dev                  # http://localhost:3000, admin at /admin
npm run build
npm run generate:types       # after changing a collection
stripe listen --forward-to localhost:3000/api/stripe/webhook   # local webhooks
```

## Skills

Use the `payload` skill for collections, access control and hooks, and the
Stripe skills (`stripe:stripe-best-practices`) for Checkout and webhooks.
