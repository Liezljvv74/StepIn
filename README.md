# StepIn

StepIn sells tickets to events. The owner manages events, ticket prices,
tables and bookings in an admin panel. Customers pick an event, name each
guest, choose a ticket type for each one and pay through Stripe Checkout.

- **Live site:** <https://stepin-virid.vercel.app>
- **Admin panel:** <https://stepin-virid.vercel.app/admin>
- **Payments:** Stripe **sandbox** only (test keys, test cards, no real money)

Built with Payload CMS 3 inside Next.js 16, Postgres on Neon, Stripe Checkout,
and hosted on Vercel.

## What StepIn sells

Tickets to the owner's events: dances, dinners, functions. Each event has a
name, description, date and time, venue, an optional image, and one or more
**ticket types** (for example *Standard* and *VIP*), each with its own price.
A purchase is for 1–10 guests, and every guest is named and has their own
ticket type.

## Using StepIn (for the owner)

Log in at `/admin`. On a new database the first visit shows **Create first
user**; that account is the admin login from then on. Nothing in the admin
needs a code change or a redeploy: the public site reads from the database on
every visit, so a published change is live straight away.

### Events

1. **Events → Create New.**
2. Fill in name, description, venue, date and time, and optionally an image.
3. **Ticket types:** a name and a price **in cents** (`2500` = €25.00, minimum
   `50`). Add as many as needed.
4. **Table plan** (optional): one line per kind of table: shape (long, round,
   square), number of tables, seats per table. Line one takes the low table
   numbers. No lines means the room is not laid out yet and sales are not
   limited.
5. **Publish changes** puts the event on the site. **Save Draft** keeps it
   hidden and does not change the live room.

The web address (slug) is made from the name and the date, for example
`mandjiedans-2026-10-31`, so the same event can run on many dates.

Shrinking a table plan while guests sit at the tables it would remove is
refused with a message naming the tables and guests. Tick **Confirm: remove
tables where guests are seated** and publish again to go ahead; those guests
become unseated.

Deleting an event deletes its bookings too. Its orders are kept and still show
the event's name and date.

### Bookings

**Bookings** lists every party coming to an event, both phone bookings and
online purchases.

- **Phone booking:** party name, telephone (required), and the guests. Each
  guest has a status (*Paid*, *Pay at venue*, *Not paying*, *Cancelled*), a
  table, a ticket type and a price in cents. A new party is seated
  automatically at the table with the least room to spare that still fits
  them, or across neighbouring tables if none fits.
- **Online booking:** created automatically when Stripe confirms a payment,
  with the guests' names, all *Paid*, and the buyer's phone from Stripe.
- **Cancel one guest:** set their status to *Cancelled*; the seat is freed.
- **Cancel the whole booking:** tick **Cancel the whole booking** and save.
  Parties whose guests are all cancelled leave the list.
- **Needs seating** is ticked on any party with a guest who has no table, so
  they can be found and placed.

### Orders

**Orders** is the payment record for online purchases: guests, amount, buyer
email and phone, Stripe session, and status (*pending* or *paid*). An order is
marked paid only by Stripe's verified webhook, never by the success page.

## Buying tickets (for customers)

1. Open an event and choose how many guests (1–10).
2. Type each guest's name and pick their ticket type.
3. **Buy tickets** holds those seats for 31 minutes and opens Stripe Checkout,
   which also asks for a phone number.
4. After paying, the success page shows **You're in!** once Stripe has
   confirmed the payment (refresh if it says it is still confirming).

When every seat is taken or being paid for, the event page shows **Sold out**.
An abandoned payment page expires after 31 minutes and its seats are free
again.

**Test cards (sandbox):** `4242 4242 4242 4242` succeeds; `4000 0000 0000 0002`
is declined. Use any future expiry date and any CVC.

## How payment works

- Prices come from the database on the server. The browser only sends the
  event, the guests' names and the ticket types they chose.
- Money is stored in integer cents, as Stripe's `unit_amount` is.
- An order becomes paid only from the `checkout.session.completed` webhook
  (or `checkout.session.async_payment_succeeded`) with a verified signature
  (`STRIPE_WEBHOOK_SECRET`).
- The webhook is idempotent: a delivery repeated, even at the same moment,
  never creates a second booking. If the booking cannot be created, the
  webhook answers with an error so Stripe delivers it again.
- Seats are counted and held under a per-event database lock, so two buyers
  cannot take the same last seats.

## Running it locally

You need Node 20+, access to the Neon project **StepIn**, and the
[Stripe CLI](https://docs.stripe.com/stripe-cli) logged in to the sandbox.

1. `npm install`
2. Create `.env` from `.env.example` (it is never committed):

   | Variable | What it is |
   |---|---|
   | `DATABASE_URL` | Neon **dev** branch, pooled connection |
   | `DATABASE_URL_UNPOOLED` | Neon **dev** branch, direct connection |
   | `PAYLOAD_SECRET` | Any long random string |
   | `STRIPE_SECRET_KEY` | Stripe sandbox secret key (`sk_test_…`) |
   | `STRIPE_WEBHOOK_SECRET` | The `whsec_…` that `stripe listen` prints |
   | `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3000` |
   | `BLOB_READ_WRITE_TOKEN` | Image storage; `vercel env pull` writes it to `.env.local` |

   `neon connection-string dev` (pooled with `--pooled`) prints the database
   values.
3. Run the app and the webhook forwarding in two terminals:

   ```bash
   npm run dev
   stripe listen --events checkout.session.completed,checkout.session.async_payment_succeeded --forward-to localhost:3000/api/stripe/webhook
   ```

4. Open <http://localhost:3000> for the site and <http://localhost:3000/admin>
   for the admin panel.

Local work uses the Neon **dev** branch, so it never touches live data.

## Tests

```bash
npm run test:unit   # seating rules and Stripe line grouping (no database)
npm run test:int    # Payload, bookings, checkout and webhook against the dev database
npm test            # both
```

The integration tests create and delete their own events, bookings and orders
on the dev branch. Test reports are in [`Reports/`](Reports):
`StepIn-Development-Test-Report.xlsx` (every check made while building, with
fixes) and `StepIn-Functionality-Test-Report.xlsx` (feature tests).

## Deployment

- **Vercel project** `stepin`, connected to
  <https://github.com/Liezljvv74/StepIn>. Pushes to `main` deploy production;
  other branches get preview deployments.
- Functions run in `fra1` (Frankfurt, `vercel.json`), next to the database.
- **Environment variables on Vercel:** `DATABASE_URL`,
  `DATABASE_URL_UNPOOLED`, `PAYLOAD_SECRET`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET` and `BLOB_READ_WRITE_TOKEN`. The database, Payload
  and Stripe values are stored as sensitive (hidden) values. Checkout uses Vercel's own address when
  `NEXT_PUBLIC_SERVER_URL` is not set.
- **Stripe webhook** for production:
  `https://stepin-virid.vercel.app/api/stripe/webhook`, events
  `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- **Images** are stored in the Vercel Blob store `stepin-media`.
- **Databases:** production uses the Neon branch **main**; local development
  and previews use **dev**.
- **Schema changes** reach production as Payload migrations in
  `src/migrations/`:
  1. After changing a collection, run `npm run payload migrate:create <name>`
     and commit the files it writes.
  2. Test it on a throwaway copy of production:
     `neon branches create --name migrate-check --parent main`, run
     `npm run payload migrate` with `DATABASE_URL` set to that branch's direct
     connection string, check the result, then delete the branch.
  3. Merging to `main` deploys production; the production build
     (`npm run vercel-build`) runs `payload migrate` before building.
- Previews are behind Vercel login, so Stripe cannot reach their webhook and
  purchases there stay pending. Test payments on production or locally.

## Project structure

| Path | What it holds |
|---|---|
| `src/collections/` | `Events`, `Bookings`, `Orders`, `Media`, `Users` |
| `src/collections/hooks/` | Table plans, booking seating and summaries, paid order → booking |
| `src/lib/seating.ts` | Seating rules (pure functions) |
| `src/lib/event-seats.ts` | The one place seats are counted, plus the per-event lock |
| `src/lib/reserve-seats.ts` | Checks a purchase and holds its seats |
| `src/app/(frontend)/` | Public site: event list, event page and buy form, success page |
| `src/app/(payload)/api/stripe/webhook/route.ts` | Stripe webhook |
| `src/migrations/` | Database migrations |
| `tests/unit`, `tests/int` | Automated tests |
| `docs/superpowers/` | Design and build plan for the venue-management features |
| `Reports/` | Test reports |
| `CLAUDE.md` | Project brief and the payment rules for AI agents |

## Built with agent skills

The Payload skills (`payload`, `cms-migration`, in `.claude/skills/`) and the
Stripe plugin for Claude Code were installed before any app code was written.
`CLAUDE.md` tells agents to use them for collections, hooks, Checkout and
webhooks.

## What comes next

StepIn is gaining the venue-management features of the owner's earlier diary
app. Design: `docs/superpowers/specs/2026-10-19-venue-management-design.md`.

- **Done:** bookings, table plans, seating, per-guest checkout with seat hold.
- **Phase 2:** expenses per event and an event dashboard (seating, seats left,
  bookings, money still to collect, expenses, income, profit).
- **Phase 3:** Settings, defaults for new events, repeat events, regular guests.
- **Phase 4:** CSV reports and the door list (Excel, printable page, CSV).
- **Phase 5:** automatic close and clean-up of past events (orders are kept).

## Known issues

- `npm run lint` fails with an ESLint configuration error inherited from the
  Payload template; it does not affect the build or the tests.
- Some template files are not used by StepIn: `docker-compose.yml` (set up for
  MongoDB), `Dockerfile`, `test.env` and the Playwright tests in `tests/e2e`.
